# YouTube OAuth 连接流程完整 Walkthrough

本文档详细解释 YouTube OAuth 连接的每一步，包括每个文件的每一行代码的作用、可能的问题点、以及如何 debug。

---

## 📋 目录

1. [流程总览](#流程总览)
2. [Step 1: 用户点击连接按钮](#step-1-用户点击连接按钮)
3. [Step 2: 后端生成 OAuth URL](#step-2-后端生成-oauth-url)
4. [Step 3: Google OAuth 授权](#step-3-google-oauth-授权)
5. [Step 4: OAuth Callback 处理](#step-4-oauth-callback-处理)
6. [Step 5: 刷新连接状态](#step-5-刷新连接状态)
7. [常见问题与 Debug 方法](#常见问题与-debug-方法)
8. [逻辑问题与修复建议](#逻辑问题与修复建议)

---

## 流程总览

```
用户界面 (Dashboard)
    ↓
1. 点击 "Connect YouTube" 按钮
    ↓
2. 前端调用 /api/youtube/connect
    ↓
3. 后端生成 Google OAuth URL
    ↓
4. 重定向到 Google 授权页面
    ↓
5. 用户授权后 Google 回调 /api/youtube/callback
    ↓
6. 后端存储 tokens 和频道信息
    ↓
7. 重定向回 Dashboard 并刷新状态
    ↓
8. 显示 "View Videos" 按钮
```

---

## Step 1: 用户点击连接按钮

### 涉及文件
- `app/page.tsx` (Dashboard 主页)
- `components/youtube/connect-card.tsx` (YouTube 连接卡片组件)

### 详细流程

#### 📄 `app/page.tsx` (第 98 行)

```tsx
<YouTubeConnectCard />
```

**作用**: 在 Dashboard 渲染 YouTube 连接卡片组件

**Debug 方法**:
```javascript
// 在浏览器控制台检查组件是否被渲染
document.querySelector('[data-testid="youtube-connect-card"]') // 如果返回 null，说明组件未渲染
```

---

#### 📄 `components/youtube/connect-card.tsx`

##### 第 33-37 行：初始化状态

```tsx
export function YouTubeConnectCard() {
  const [status, setStatus] = useState<ConnectionStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

**作用**: 定义组件的所有状态
- `status`: 连接状态（是否已连接、频道名称等）
- `isLoading`: 是否正在加载连接状态
- `isConnecting`: 是否正在进行 OAuth 连接
- `error`: 错误消息

**可能的问题**: 如果状态管理混乱，可能导致 UI 显示不正确

**Debug 方法**:
```javascript
// 在浏览器控制台
// 1. 安装 React DevTools 扩展
// 2. 找到 YouTubeConnectCard 组件
// 3. 查看 hooks 里的状态值
```

---

##### 第 40-53 行：组件挂载时获取连接状态

```tsx
// 第 40-42 行：首次加载时获取状态
useEffect(() => {
  fetchConnectionStatus();
}, []);

// 第 45-53 行：OAuth 回调后刷新状态
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('success')) {
    // Wait a bit for database to update
    setTimeout(() => {
      fetchConnectionStatus();
    }, 500);
  }
}, []);
```

**作用**:
1. 第一个 `useEffect`: 组件挂载时立即获取连接状态
2. 第二个 `useEffect`: 如果 URL 有 `?success=` 参数（OAuth 成功后），等待 500ms 后刷新状态

**⚠️ 潜在问题**: 500ms 的延迟可能不够，数据库更新可能需要更长时间

**Debug 方法**:
```javascript
// 在浏览器控制台
console.log('URL params:', new URLSearchParams(window.location.search).toString());
// 如果看到 success=xxx，说明 OAuth 成功了

// 检查是否调用了 fetchConnectionStatus
// 在 components/youtube/connect-card.tsx 第 50 行添加：
console.log('🔄 Refetching status after OAuth success');
```

**修复建议**: 增加延迟时间或使用轮询
```tsx
// 改进版本：轮询直到连接成功
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('success')) {
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 1000; // 1秒

    const poll = setInterval(async () => {
      await fetchConnectionStatus();
      attempts++;

      // 如果已连接或达到最大尝试次数，停止轮询
      if (status.isConnected || attempts >= maxAttempts) {
        clearInterval(poll);
      }
    }, pollInterval);

    return () => clearInterval(poll);
  }
}, []);
```

---

##### 第 55-100 行：获取连接状态

```tsx
const fetchConnectionStatus = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const supabase = createClient();

    // 第 63 行：获取当前用户 session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const userId = session.user.id;

    // 第 72-76 行：从数据库获取 church 记录
    const { data: church, error: churchError } = await (supabase
      .from('churches') as any)
      .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
      .eq('id', userId)
      .single();

    if (churchError && churchError.code !== 'PGRST116') {
      throw churchError;
    }

    // 第 84-93 行：检查是否已连接 YouTube
    if (church?.youtube_channel_id) {
      setStatus({
        isConnected: true,
        channelName: church.youtube_channel_name || undefined,
        channelThumbnail: church.youtube_channel_thumbnail || undefined,
        channelId: church.youtube_channel_id,
      });
    } else {
      setStatus({ isConnected: false });
    }
  } catch (err) {
    console.error('Failed to fetch connection status:', err);
    setError(err instanceof Error ? err.message : 'Failed to check connection status');
  } finally {
    setIsLoading(false);
  }
};
```

**作用**: 从 Supabase 数据库查询 church 记录，判断是否已连接 YouTube

**关键逻辑**:
1. 获取当前登录用户的 session
2. 用 `userId` 查询 `churches` 表
3. 检查 `youtube_channel_id` 字段是否存在

**⚠️ 潜在问题**:
1. **问题 1**: 第 75 行使用 `.eq('id', userId)` 假设 church.id = user.id，但如果用户可以属于多个 church，这个逻辑就错了
2. **问题 2**: 第 78 行只处理 `PGRST116` 错误（no rows），但没有处理其他数据库错误

**Debug 方法**:
```javascript
// 在浏览器控制台
const supabase = window.supabaseClient; // 如果有全局 client
const session = await supabase.auth.getSession();
console.log('User ID:', session.data.session?.user?.id);

// 手动查询 church
const { data, error } = await supabase
  .from('churches')
  .select('*')
  .eq('id', session.data.session?.user?.id);
console.log('Church data:', data, 'Error:', error);
```

**修复建议**: 添加更详细的错误处理
```tsx
// 改进版本
const { data: church, error: churchError } = await supabase
  .from('churches')
  .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
  .eq('id', userId)
  .single();

if (churchError) {
  if (churchError.code === 'PGRST116') {
    // 没有找到 church 记录，这是正常的（首次使用）
    console.log('No church record found for user, will be created on connect');
    setStatus({ isConnected: false });
    return;
  } else {
    // 其他数据库错误
    console.error('Database error:', churchError);
    throw new Error(`Database error: ${churchError.message}`);
  }
}
```

---

##### 第 102-129 行：处理连接按钮点击

```tsx
const handleConnect = async () => {
  setIsConnecting(true);
  setError(null);

  try {
    // 第 108-113 行：调用后端 API
    const response = await fetch('/api/youtube/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error || 'Failed to initiate YouTube connection');
    }

    const { authUrl } = await response.json();

    // 第 123 行：重定向到 Google OAuth
    window.location.href = authUrl;
  } catch (err) {
    console.error('Connection error:', err);
    setError(err instanceof Error ? err.message : 'Failed to connect to YouTube');
    setIsConnecting(false);
  }
};
```

**作用**:
1. 调用后端 `/api/youtube/connect` 生成 OAuth URL
2. 重定向到 Google 授权页面

**关键逻辑**:
- 第 123 行使用 `window.location.href` 重定向，会离开当前页面

**Debug 方法**:
```javascript
// 在 connect-card.tsx 第 108 行之前添加：
console.log('🔵 Calling /api/youtube/connect');

// 在第 120 行之后添加：
console.log('✅ Received authUrl:', authUrl);

// 在第 123 行之前添加：
console.log('🔀 Redirecting to Google OAuth:', authUrl);

// 在浏览器 Network 面板查看请求
// 1. 打开 DevTools → Network 标签
// 2. 点击 "Connect YouTube" 按钮
// 3. 查看 /api/youtube/connect 请求
//    - Status 应该是 200
//    - Response 应该包含 authUrl
```

**⚠️ 潜在问题**:
1. **问题 1**: 如果用户没有登录，这里会失败（返回 401）
2. **问题 2**: 没有添加 loading 指示器，用户可能重复点击

**修复建议**: 添加登录检查
```tsx
const handleConnect = async () => {
  setIsConnecting(true);
  setError(null);

  try {
    // 先检查用户是否登录
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setError('Please sign in first to connect YouTube');
      setIsConnecting(false);
      return;
    }

    const response = await fetch('/api/youtube/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // ... 其余代码
  }
};
```

---

##### 第 196-202 行：连接按钮 UI

```tsx
<Button
  onClick={handleConnect}
  disabled={isConnecting}
  className="w-full"
>
  {isConnecting ? 'Connecting...' : 'Connect YouTube'}
</Button>
```

**作用**: 渲染连接按钮，显示 loading 状态

**Debug 方法**:
```javascript
// 检查按钮是否被正确渲染
document.querySelector('button:contains("Connect YouTube")');

// 检查按钮是否被禁用
const btn = document.querySelector('button');
console.log('Button disabled:', btn.disabled);
```

---

##### 第 228-233 行：已连接时显示 "View Videos" 按钮

```tsx
<Link href="/videos" className="block w-full">
  <Button className="w-full">
    <Video className="w-4 h-4 mr-2" />
    View Videos
  </Button>
</Link>
```

**作用**: 连接成功后显示 "View Videos" 按钮，跳转到 `/videos` 页面

**⚠️ 潜在问题**:
- **这是你问的关键问题！** 如果 `status.isConnected` 没有正确更新为 `true`，这个按钮就不会显示

**Debug 方法**:
```javascript
// 在浏览器控制台查看组件状态
// 使用 React DevTools 查看 YouTubeConnectCard 的 status 状态
// 应该看到 status.isConnected = true

// 或者在第 228 行之前添加调试代码：
console.log('📊 Connection status:', status);
```

**可能导致按钮不显示的原因**:
1. ✅ OAuth 成功，但 database 更新太慢（500ms 不够）
2. ✅ `fetchConnectionStatus()` 查询逻辑有问题
3. ✅ 数据库的 `youtube_channel_id` 字段没有正确存储
4. ✅ RLS (Row Level Security) 策略阻止了查询

---

## Step 2: 后端生成 OAuth URL

### 涉及文件
- `app/api/youtube/connect/route.ts` (连接 API 端点)
- `lib/youtube/oauth.ts` (OAuth 辅助函数)

---

#### 📄 `app/api/youtube/connect/route.ts`

##### 第 20-38 行：验证用户身份

```tsx
export async function POST(request: NextRequest) {
  try {
    // 第 23-24 行：创建 Supabase 客户端
    const supabase = createClient();
    const service = createServiceClient();

    // 第 28-31 行：获取当前用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    const userId = user.id;
```

**作用**:
1. 创建两个 Supabase 客户端：
   - `supabase`: 普通客户端，受 RLS 限制
   - `service`: 服务角色客户端，绕过 RLS（仅用于初始化）
2. 获取当前登录用户，如果未登录返回 401

**关键逻辑**: 使用 `getUser()` 而不是 `getSession()`，因为服务端更安全

**Debug 方法**:
```bash
# 在服务器日志中添加调试信息
# 在 route.ts 第 28 行之后添加：
console.log('🔐 User authenticated:', user.id, user.email);

# 测试 API 端点（在终端）
curl -X POST http://localhost:8000/api/youtube/connect \
  -H "Cookie: your-session-cookie"
```

---

##### 第 42-74 行：获取或创建 Church

```tsx
// 第 44-48 行：查询 church 是否存在
const { data: church, error: churchError } = await (service
  .from('churches') as any)
  .select('id')
  .eq('id', userId)
  .single();

let churchId: string;

// 第 52-70 行：如果不存在，创建新 church
if (churchError || !church) {
  const { data: newChurch, error: createError } = await (service
    .from('churches')
    .insert as any)({
      id: userId,
      name: user.email || 'My Church',
    })
    .select('id')
    .single();

  if (createError || !newChurch) {
    console.error('Failed to create church:', createError);
    return NextResponse.json(
      { error: 'Failed to initialize church account. Please try again.' },
      { status: 500 }
    );
  }

  churchId = newChurch.id;
} else {
  churchId = church.id;
}
```

**作用**: 确保用户有对应的 church 记录（自动创建）

**关键逻辑**:
- 使用 `service` 客户端绕过 RLS，因为 church 可能还不存在
- `church.id = user.id` 的映射关系

**⚠️ 潜在问题**:
1. **问题 1**: 使用 service role 绕过 RLS 是必要的，但要确保不会误用
2. **问题 2**: 默认名称是 `user.email || 'My Church'`，可能不友好

**Debug 方法**:
```javascript
// 在第 44 行之后添加：
console.log('📊 Looking for church with id:', userId);

// 在第 52 行之后添加：
console.log('🆕 Creating new church for user:', userId);

// 在第 71 行之后添加：
console.log('✅ Church ready:', churchId);

// 手动查询数据库
// 在 Supabase Dashboard → Table Editor → churches
// 查看是否有对应的记录
```

---

##### 第 76-90 行：生成 OAuth URL

```tsx
// 第 77 行：生成随机 state (CSRF 保护)
const state = crypto.randomUUID();

// 第 79-81 行：设置 state 过期时间（10分钟）
const expiresAt = new Date();
expiresAt.setMinutes(expiresAt.getMinutes() + 10);

// 第 87-90 行：生成 OAuth URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
const redirectUri = `${appUrl}/api/youtube/callback`;
const authUrl = generateAuthUrl(redirectUri, state);
```

**作用**:
1. 生成随机 `state` 参数用于 CSRF 保护
2. 生成 OAuth 授权 URL，包含 `redirect_uri`

**关键逻辑**:
- `redirectUri` 是 Google 授权后回调的地址
- **重要**: `redirectUri` 必须在 Google Cloud Console 的 "Authorized redirect URIs" 中配置

**⚠️ 潜在问题**:
- **这就是你刚才遇到的 redirect 问题！**
- 如果 `NEXT_PUBLIC_APP_URL` 不正确，`redirectUri` 就会错误
- 必须确保 Google Credentials 里配置了正确的 redirect URI

**Debug 方法**:
```javascript
// 在第 90 行之后添加：
console.log('🔗 OAuth URLs:', {
  appUrl,
  redirectUri,
  authUrl
});

// 检查环境变量
console.log('ENV check:', {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV
});
```

**验证 Google Cloud Console 配置**:
1. 去 https://console.cloud.google.com/apis/credentials
2. 找到你的 OAuth 2.0 Client ID
3. 检查 "Authorized redirect URIs"
4. 必须包含：`http://localhost:8000/api/youtube/callback`
5. 也可以添加：`https://your-staging-url.vercel.app/api/youtube/callback`

---

##### 第 103-113 行：存储 State 到用户 metadata

```tsx
const { error: updateError } = await supabase.auth.updateUser({
  data: {
    oauth_state: state,
    oauth_state_expires: expiresAt.toISOString(),
  },
});

if (updateError) {
  console.error('Failed to store OAuth state:', updateError);
  // Continue anyway, we can still use session verification
}
```

**作用**: 将 state 存储到用户的 metadata 中，用于 callback 时验证

**⚠️ 潜在问题**:
- 如果存储失败，CSRF 保护会失效（但代码选择继续）
- 更好的做法是使用专门的 `oauth_states` 表

**Debug 方法**:
```javascript
// 在第 103 行之后添加：
console.log('💾 Storing OAuth state:', state);

// 查看用户 metadata
// 在 Supabase Dashboard → Authentication → Users
// 点击用户 → 查看 Raw User Meta Data
```

---

##### 第 115-119 行：返回 OAuth URL

```tsx
return NextResponse.json({
  success: true,
  authUrl,
  state, // Return state to client for debugging
});
```

**作用**: 返回 OAuth URL 给前端

**Debug 方法**:
```bash
# 测试完整请求
curl -X POST http://localhost:8000/api/youtube/connect \
  -H "Cookie: your-session-cookie" \
  -v

# 应该返回类似：
# {"success":true,"authUrl":"https://accounts.google.com/o/oauth2/v2/auth?...","state":"..."}
```

---

#### 📄 `lib/youtube/oauth.ts`

##### 第 43-58 行：生成 OAuth URL

```tsx
export function generateAuthUrl(redirectUri: string, state: string): string {
  // 第 44-48 行：创建 OAuth2 客户端
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // 第 50-55 行：生成授权 URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: YOUTUBE_SCOPES,
    state: state, // CSRF protection
    prompt: 'consent', // Force consent to get refresh token
  });

  return authUrl;
}
```

**作用**: 使用 Google OAuth2 库生成授权 URL

**关键参数**:
- `access_type: 'offline'`: 请求 refresh token
- `prompt: 'consent'`: 强制显示授权页面（确保获得 refresh token）
- `scope`: YouTube API 权限范围

**Debug 方法**:
```javascript
// 打印生成的 URL
console.log('Generated OAuth URL:', authUrl);

// 检查 URL 参数
const url = new URL(authUrl);
console.log('OAuth params:', {
  client_id: url.searchParams.get('client_id'),
  redirect_uri: url.searchParams.get('redirect_uri'),
  state: url.searchParams.get('state'),
  scope: url.searchParams.get('scope'),
});
```

**验证环境变量**:
```bash
# 检查 .env.local
cat .env.local | grep GOOGLE_CLIENT

# 应该看到：
# GOOGLE_CLIENT_ID=586145640757-...
# GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## Step 3: Google OAuth 授权

这一步发生在 Google 的服务器上，不是我们的代码控制的。

### 流程

1. **用户被重定向到 Google 授权页面**
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=xxx&
     redirect_uri=http://localhost:8000/api/youtube/callback&
     response_type=code&
     scope=https://www.googleapis.com/auth/youtube.readonly&
     state=xxx&
     access_type=offline&
     prompt=consent
   ```

2. **用户选择 Google 账号**
3. **用户点击 "Continue" 授权应用**
4. **Google 重定向回你的应用**
   ```
   http://localhost:8000/api/youtube/callback?
     code=4/0AeanS0...&
     state=xxx
   ```

### Debug 方法

```javascript
// 在浏览器地址栏查看 URL
// 应该看到 Google 授权页面的 URL

// 检查 redirect_uri 参数
// 复制 URL，解码 redirect_uri 参数
// 应该是 http://localhost:8000/api/youtube/callback（或你的域名）

// 授权后，查看回调 URL
// 应该看到 code 和 state 参数
```

**⚠️ 常见错误**:
1. **Error: redirect_uri_mismatch**
   - 原因：Google Credentials 中没有配置这个 redirect_uri
   - 解决：去 Google Cloud Console 添加 redirect URI

2. **Error: invalid_client**
   - 原因：Client ID 或 Secret 错误
   - 解决：检查 .env.local 中的配置

---

## Step 4: OAuth Callback 处理

### 涉及文件
- `app/api/youtube/callback/route.ts` (回调处理)
- `lib/youtube/oauth.ts` (Token 交换)
- `lib/youtube/api.ts` (获取频道信息)

---

#### 📄 `app/api/youtube/callback/route.ts`

##### 第 22-45 行：获取和验证参数

```tsx
export async function GET(request: NextRequest) {
  try {
    // 第 25-28 行：从 URL 获取参数
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 第 31-36 行：处理用户拒绝授权
    if (error === 'access_denied') {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'You denied access to your YouTube channel. Please try again to connect.'
        )}`
      );
    }

    // 第 39-44 行：验证参数完整性
    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'Invalid OAuth callback. Missing authorization code.'
        )}`
      );
    }
```

**作用**: 从 URL 获取 Google 返回的参数并验证

**Debug 方法**:
```javascript
// 在第 25 行之后添加：
console.log('📞 OAuth callback received:', {
  code: code?.substring(0, 20) + '...',
  state: state?.substring(0, 20) + '...',
  error,
  fullUrl: request.url
});
```

---

##### 第 47-64 行：验证用户 Session

```tsx
// 第 48-49 行：创建 Supabase 客户端
const supabase = createClient();
const service = createServiceClient();

// 第 51-54 行：获取当前用户
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.redirect(
    `${request.nextUrl.origin}/login?error=${encodeURIComponent(
      'Session expired. Please sign in and try again.'
    )}`
  );
}

const userId = user.id;
```

**作用**: 确保用户仍然登录（OAuth 流程可能花费几分钟）

**⚠️ 潜在问题**: 如果 session 过期，用户会被重定向到 `/login`

**Debug 方法**:
```javascript
// 在第 51 行之后添加：
console.log('👤 Callback user:', user.id, user.email);

// 如果经常遇到 session 过期，可以增加 session 时长
// 在 Supabase Dashboard → Authentication → Settings
// 调整 JWT expiry
```

---

##### 第 66-84 行：验证 State (CSRF 保护)

```tsx
// 第 67-68 行：从用户 metadata 获取存储的 state
const storedState = user.user_metadata?.oauth_state;
const stateExpires = user.user_metadata?.oauth_state_expires;

// 第 70-76 行：比对 state
if (storedState !== state) {
  console.warn('OAuth state mismatch', {
    stored: storedState,
    received: state,
  });
  // Continue anyway if session is valid (relaxed CSRF for MVP)
}

// 第 78-84 行：检查 state 是否过期
if (stateExpires && new Date(stateExpires) < new Date()) {
  return NextResponse.redirect(
    `${request.nextUrl.origin}/?error=${encodeURIComponent(
      'OAuth state expired. Please try connecting again.'
    )}`
  );
}
```

**作用**: CSRF 保护，防止攻击者伪造回调

**⚠️ 潜在问题**:
- 第 70-76 行：state 不匹配时只是 warn，没有阻止（MVP 阶段放宽了限制）
- 生产环境应该严格验证

**Debug 方法**:
```javascript
// 在第 67 行之后添加：
console.log('🔒 State verification:', {
  stored: storedState,
  received: state,
  match: storedState === state,
  expires: stateExpires
});
```

---

##### 第 86-91 行：交换 Code 为 Tokens

```tsx
const redirectUri = `${request.nextUrl.origin}/api/youtube/callback`;
const tokens = await exchangeCodeForTokens(code, redirectUri);
```

**作用**: 用授权码换取 access token 和 refresh token

**关键**: `redirectUri` 必须和生成 OAuth URL 时的一致

**Debug 方法**:
```javascript
// 在第 86 行之后添加：
console.log('🔄 Exchanging code for tokens...', { redirectUri });

// 在第 88 行之后添加：
console.log('✅ Tokens received:', {
  hasAccessToken: !!tokens.access_token,
  hasRefreshToken: !!tokens.refresh_token,
  expiresAt: tokens.expiry_date
});
```

---

##### 第 90-91 行：获取 YouTube 频道信息

```tsx
const channelInfo = await getChannelInfo(tokens.access_token);
```

**作用**: 使用 access token 调用 YouTube API 获取频道信息

**返回内容**:
```typescript
{
  id: 'UCxxxxx',        // 频道 ID
  name: 'My Channel',   // 频道名称
  thumbnail: 'https://...' // 头像 URL
}
```

**Debug 方法**:
```javascript
// 在第 91 行之后添加：
console.log('📺 YouTube channel info:', channelInfo);
```

---

##### 第 94-134 行：存储频道信息到数据库

```tsx
// 第 95-99 行：查询 church 是否存在
const { data: church } = await (service
  .from('churches') as any)
  .select('id')
  .eq('id', userId)
  .single();

let churchId: string;

// 第 103-120 行：如果不存在，创建新 church
if (!church) {
  const { data: newChurch, error: createError } = await (service
    .from('churches')
    .insert as any)({
      id: userId,
      name: user.email || channelInfo.name,
      youtube_channel_id: channelInfo.id,
      youtube_channel_name: channelInfo.name,
      youtube_channel_thumbnail: channelInfo.thumbnail,
    })
    .select('id')
    .single();

  if (createError || !newChurch) {
    throw new Error('Failed to create church record');
  }

  churchId = newChurch.id;
} else {
  // 第 122-133 行：如果存在，更新 YouTube 信息
  churchId = church.id;

  await (service
    .from('churches')
    .update as any)({
      youtube_channel_id: channelInfo.id,
      youtube_channel_name: channelInfo.name,
      youtube_channel_thumbnail: channelInfo.thumbnail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', churchId);
}
```

**作用**: 将 YouTube 频道信息存储到 `churches` 表

**⚠️ 这是关键步骤！** 如果这里失败，前端的 "View Videos" 按钮就不会显示

**Debug 方法**:
```javascript
// 在第 95 行之后添加：
console.log('📊 Looking for existing church:', userId);

// 在第 103 行添加：
console.log('🆕 Creating new church with YouTube info');

// 在第 125 行添加：
console.log('📝 Updating existing church with YouTube info');

// 验证数据是否写入成功
// 在 Supabase Dashboard → Table Editor → churches
// 查看对应用户的记录，确认 youtube_channel_id 等字段有值
```

**可能失败的原因**:
1. 数据库表结构不匹配
2. RLS 策略阻止了更新（所以使用 service role）
3. 字段类型不匹配

**验证数据库**:
```sql
-- 在 Supabase SQL Editor 执行
SELECT
  id,
  name,
  youtube_channel_id,
  youtube_channel_name,
  youtube_channel_thumbnail,
  updated_at
FROM churches
WHERE id = 'your-user-id';

-- 应该看到 YouTube 相关字段都有值
```

---

##### 第 136-166 行：加密并存储 OAuth Tokens

```tsx
// 第 137-140 行：加密 tokens
const encryptedAccessToken = encrypt(tokens.access_token);
const encryptedRefreshToken = tokens.refresh_token
  ? encrypt(tokens.refresh_token)
  : null;

// 第 143-161 行：存储到 oauth_tokens 表
const { error: tokenError } = await (service
  .from('oauth_tokens')
  .upsert as any)(
    {
      church_id: churchId,
      provider: 'youtube',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'church_id,provider',
    }
  );

if (tokenError) {
  console.error('Failed to store OAuth tokens:', tokenError);
  throw new Error('Failed to save YouTube connection. Please try again.');
}
```

**作用**:
1. 使用 AES-256 加密 tokens（安全性）
2. 存储到 `oauth_tokens` 表
3. 使用 `upsert` 自动处理插入或更新

**Debug 方法**:
```javascript
// 在第 137 行之后添加：
console.log('🔐 Encrypting tokens');

// 在第 143 行之后添加：
console.log('💾 Storing encrypted tokens to database');

// 验证 tokens 是否存储成功
// 在 Supabase Dashboard → Table Editor → oauth_tokens
// 查看是否有对应的记录（access_token 应该是加密的字符串）
```

**验证数据库**:
```sql
-- 在 Supabase SQL Editor 执行
SELECT
  church_id,
  provider,
  token_type,
  expires_at,
  updated_at,
  LENGTH(access_token) as token_length
FROM oauth_tokens
WHERE church_id = 'your-user-id' AND provider = 'youtube';

-- 应该看到一条记录，token_length 应该很长（加密后的）
```

---

##### 第 169-174 行：清理 OAuth State

```tsx
await supabase.auth.updateUser({
  data: {
    oauth_state: null,
    oauth_state_expires: null,
  },
});
```

**作用**: 清理用户 metadata 中的 state（防止重放攻击）

---

##### 第 176-181 行：重定向回 Dashboard

```tsx
return NextResponse.redirect(
  `${request.nextUrl.origin}/?success=${encodeURIComponent(
    `Connected to YouTube as ${channelInfo.name}`
  )}`
);
```

**作用**: 重定向到首页，URL 带 `?success=...` 参数显示成功消息

**Debug 方法**:
```javascript
// 在第 176 行之前添加：
console.log('✅ OAuth flow completed successfully');
console.log('🔀 Redirecting to:', `${request.nextUrl.origin}/?success=...`);
```

**这里是触发前端 refetch 的关键！**
- 前端 `useEffect` 会检测到 `?success` 参数
- 然后调用 `fetchConnectionStatus()` 刷新状态

---

## Step 5: 刷新连接状态

回到前端 `components/youtube/connect-card.tsx`

### 流程

1. **用户被重定向回 Dashboard**
   ```
   http://localhost:8000/?success=Connected%20to%20YouTube%20as%20My%20Channel
   ```

2. **第 45-53 行的 useEffect 触发**
   ```tsx
   useEffect(() => {
     const urlParams = new URLSearchParams(window.location.search);
     if (urlParams.has('success')) {
       setTimeout(() => {
         fetchConnectionStatus();
       }, 500);
     }
   }, []);
   ```

3. **`fetchConnectionStatus()` 查询数据库**
   ```tsx
   const { data: church } = await supabase
     .from('churches')
     .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
     .eq('id', userId)
     .single();
   ```

4. **如果 `church.youtube_channel_id` 存在，设置 `isConnected = true`**
   ```tsx
   if (church?.youtube_channel_id) {
     setStatus({
       isConnected: true,
       channelName: church.youtube_channel_name || undefined,
       channelThumbnail: church.youtube_channel_thumbnail || undefined,
       channelId: church.youtube_channel_id,
     });
   }
   ```

5. **UI 重新渲染，显示 "View Videos" 按钮**
   ```tsx
   {status.isConnected && (
     <Link href="/videos">
       <Button>View Videos</Button>
     </Link>
   )}
   ```

### ⚠️ 最常见的问题：按钮不显示

**可能的原因**:

1. **500ms 延迟不够，数据库还没写入完成**
   ```javascript
   // 解决：增加延迟或使用轮询
   setTimeout(() => {
     fetchConnectionStatus();
   }, 2000); // 改为 2 秒
   ```

2. **RLS 策略阻止了查询**
   ```sql
   -- 检查 RLS 策略
   SELECT * FROM pg_policies WHERE tablename = 'churches';

   -- 确保有类似这样的策略：
   CREATE POLICY "Users can read their own church"
     ON churches FOR SELECT
     USING (id = auth.uid());
   ```

3. **查询逻辑错误（church.id 不等于 user.id）**
   ```typescript
   // 检查映射关系
   console.log('User ID:', userId);
   console.log('Church ID:', church?.id);
   console.log('Match:', church?.id === userId);
   ```

4. **数据库字段名不匹配**
   ```sql
   -- 验证字段是否存在
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'churches';

   -- 确保有：
   -- youtube_channel_id (text)
   -- youtube_channel_name (text)
   -- youtube_channel_thumbnail (text)
   ```

---

## 常见问题与 Debug 方法

### 问题 1: 点击 "Connect YouTube" 没反应

**可能原因**:
- 用户未登录
- API 请求失败
- 按钮被禁用

**Debug 步骤**:
```javascript
// 1. 检查用户是否登录
const supabase = createClient();
const { data } = await supabase.auth.getSession();
console.log('Logged in:', !!data.session);

// 2. 检查 Network 请求
// DevTools → Network → 查看 /api/youtube/connect
// Status 应该是 200

// 3. 检查按钮状态
const btn = document.querySelector('button:contains("Connect YouTube")');
console.log('Disabled:', btn.disabled);
```

---

### 问题 2: Google OAuth 显示 "redirect_uri_mismatch"

**原因**: Google Cloud Console 没有配置 redirect URI

**解决步骤**:
1. 去 https://console.cloud.google.com/apis/credentials
2. 找到 OAuth 2.0 Client ID
3. 编辑 "Authorized redirect URIs"
4. 添加：
   - `http://localhost:8000/api/youtube/callback`
   - `https://your-staging.vercel.app/api/youtube/callback`
5. 保存

---

### 问题 3: OAuth 成功但按钮不显示

**最可能的原因**: 数据库写入成功，但前端查询失败或延迟不够

**Debug 步骤**:

```javascript
// 1. 检查数据库是否写入成功
// Supabase Dashboard → Table Editor → churches
// 查看用户的 youtube_channel_id 是否有值

// 2. 手动测试查询
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const { data: church, error } = await supabase
  .from('churches')
  .select('youtube_channel_id, youtube_channel_name')
  .eq('id', session.user.id)
  .single();
console.log('Church:', church, 'Error:', error);

// 3. 检查 useEffect 是否触发
// 在 connect-card.tsx 第 47 行添加：
console.log('🔍 Checking for success param:', new URLSearchParams(window.location.search).get('success'));

// 4. 检查 fetchConnectionStatus 是否被调用
// 在 fetchConnectionStatus 函数开头添加：
console.log('🔄 fetchConnectionStatus called');

// 5. 检查 status 状态
// React DevTools → 找到 YouTubeConnectCard → 查看 status.isConnected
```

---

### 问题 4: Session 过期或 401 错误

**原因**:
- Cookie 没有正确传递
- Session 超时
- Supabase 配置问题

**Debug 步骤**:
```javascript
// 1. 检查 cookie
console.log('Cookies:', document.cookie);

// 2. 检查 session
const supabase = createClient();
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session, 'Error:', error);

// 3. 重新登录
// 去 /login 页面重新登录

// 4. 检查 Supabase 配置
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

---

## 逻辑问题与修复建议

### 问题 1: 500ms 延迟不够可靠

**当前代码** (`connect-card.tsx` 第 45-53 行):
```tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('success')) {
    setTimeout(() => {
      fetchConnectionStatus();
    }, 500);
  }
}, []);
```

**问题**:
- 数据库写入可能需要更长时间
- 网络延迟可能导致查询时数据还没写入

**建议修复** (使用轮询):
```tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('success')) {
    let attempts = 0;
    const maxAttempts = 10; // 最多尝试 10 次
    const interval = 1000; // 每秒一次

    const pollStatus = async () => {
      console.log(`🔄 Polling connection status (attempt ${attempts + 1}/${maxAttempts})`);
      await fetchConnectionStatus();

      // 检查是否已连接
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: church } = await supabase
        .from('churches')
        .select('youtube_channel_id')
        .eq('id', session?.user?.id)
        .single();

      attempts++;

      if (church?.youtube_channel_id) {
        console.log('✅ Connection confirmed!');
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ Max polling attempts reached');
        clearInterval(pollInterval);
        setError('Connection status check timed out. Please refresh the page.');
      }
    };

    // 立即检查一次
    pollStatus();

    // 然后每秒检查一次
    const pollInterval = setInterval(pollStatus, interval);

    return () => clearInterval(pollInterval);
  }
}, []);
```

---

### 问题 2: Church ID = User ID 的映射可能不灵活

**当前逻辑**:
```tsx
// connect/route.ts 第 75 行
.eq('id', userId)

// connect-card.tsx 第 75 行
.eq('id', userId)
```

**问题**: 假设 church.id = user.id，如果以后改为一个用户可以管理多个 church，这个逻辑会失败

**建议**: 添加一个中间表
```sql
-- 创建 church_members 表
CREATE TABLE church_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, user_id)
);

-- 修改查询逻辑
SELECT churches.*
FROM churches
JOIN church_members ON church_members.church_id = churches.id
WHERE church_members.user_id = auth.uid();
```

---

### 问题 3: 错误处理不够详细

**当前代码** (`callback/route.ts` 第 182-196 行):
```tsx
} catch (error) {
  console.error('OAuth callback error:', {
    error,
    endpoint: '/api/youtube/callback',
  });

  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Failed to complete YouTube connection. Please try again.';

  return NextResponse.redirect(
    `${request.nextUrl.origin}/?error=${encodeURIComponent(errorMessage)}`
  );
}
```

**问题**: 没有区分不同类型的错误

**建议修复**:
```tsx
} catch (error) {
  console.error('OAuth callback error:', {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    endpoint: '/api/youtube/callback',
  });

  let errorMessage = 'Failed to complete YouTube connection. Please try again.';
  let errorCode = 'UNKNOWN_ERROR';

  if (error instanceof Error) {
    // 根据错误类型提供具体的错误消息
    if (error.message.includes('token exchange')) {
      errorMessage = 'Failed to exchange authorization code. The authorization may have expired. Please try connecting again.';
      errorCode = 'TOKEN_EXCHANGE_FAILED';
    } else if (error.message.includes('channel info')) {
      errorMessage = 'Failed to fetch YouTube channel information. Please ensure you have a YouTube channel.';
      errorCode = 'CHANNEL_INFO_FAILED';
    } else if (error.message.includes('database')) {
      errorMessage = 'Failed to save connection to database. Please contact support.';
      errorCode = 'DATABASE_ERROR';
    } else {
      errorMessage = error.message;
    }
  }

  // 记录到日志服务（生产环境）
  // await logError({ code: errorCode, message: errorMessage, user: userId });

  return NextResponse.redirect(
    `${request.nextUrl.origin}/?error=${encodeURIComponent(errorMessage)}&code=${errorCode}`
  );
}
```

---

### 问题 4: 没有 Loading 状态的视觉反馈

**当前代码**: OAuth 过程中用户会看到空白页或 Google 页面

**建议**: 添加 loading overlay

```tsx
// 在 connect-card.tsx 中添加
{isConnecting && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-center">Connecting to YouTube...</p>
      <p className="mt-2 text-sm text-gray-500 text-center">This may take a few seconds</p>
    </div>
  </div>
)}
```

---

## 完整的 Debug Checklist

使用这个 checklist 来系统地 debug OAuth 连接问题：

### ✅ 环境配置

- [ ] `.env.local` 文件存在且包含所有必要的环境变量
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
  GOOGLE_CLIENT_ID=xxx
  GOOGLE_CLIENT_SECRET=xxx
  NEXT_PUBLIC_APP_URL=http://localhost:8000
  ENCRYPTION_KEY=xxx
  ```

- [ ] Google Cloud Console 配置正确
  - OAuth 2.0 Client ID 存在
  - Authorized redirect URIs 包含 `http://localhost:8000/api/youtube/callback`
  - YouTube Data API v3 已启用

- [ ] Supabase Dashboard 配置正确
  - Authentication → URL Configuration
  - Site URL = `http://localhost:8000`
  - Redirect URLs 包含 `http://localhost:8000/**`

### ✅ 数据库结构

- [ ] `churches` 表存在且包含字段：
  - `id` (UUID, Primary Key)
  - `youtube_channel_id` (TEXT)
  - `youtube_channel_name` (TEXT)
  - `youtube_channel_thumbnail` (TEXT)

- [ ] `oauth_tokens` 表存在且包含字段：
  - `church_id` (UUID)
  - `provider` (TEXT)
  - `access_token` (TEXT, encrypted)
  - `refresh_token` (TEXT, encrypted)
  - `expires_at` (TIMESTAMPTZ)

- [ ] RLS 策略配置正确
  ```sql
  -- 检查策略
  SELECT * FROM pg_policies WHERE tablename IN ('churches', 'oauth_tokens');
  ```

### ✅ 前端流程

- [ ] 用户已登录 (有 Supabase session)
- [ ] 点击 "Connect YouTube" 按钮触发 `handleConnect`
- [ ] Network 请求 `/api/youtube/connect` 返回 200
- [ ] Response 包含 `authUrl`
- [ ] 页面重定向到 Google OAuth

### ✅ OAuth 授权流程

- [ ] Google OAuth URL 包含正确的参数
  - `client_id`
  - `redirect_uri`
  - `state`
  - `scope`
  - `access_type=offline`
  - `prompt=consent`

- [ ] 用户成功授权
- [ ] Google 重定向回 `/api/youtube/callback?code=xxx&state=xxx`

### ✅ 后端 Callback 处理

- [ ] `/api/youtube/callback` 接收到 `code` 和 `state`
- [ ] 用户 session 有效
- [ ] State 验证通过（或警告）
- [ ] Token 交换成功（有 access_token 和 refresh_token）
- [ ] 获取 YouTube 频道信息成功
- [ ] 数据写入 `churches` 表成功
- [ ] 数据写入 `oauth_tokens` 表成功
- [ ] 重定向到 `/?success=...`

### ✅ 前端状态刷新

- [ ] URL 包含 `?success` 参数
- [ ] `useEffect` 触发 `fetchConnectionStatus`
- [ ] 查询 `churches` 表成功
- [ ] `church.youtube_channel_id` 有值
- [ ] `status.isConnected` 被设置为 `true`
- [ ] UI 重新渲染显示 "View Videos" 按钮

---

## 添加全面的日志

在所有关键位置添加日志以便 debug：

### 前端日志 (`connect-card.tsx`)

```tsx
// 第 55 行
const fetchConnectionStatus = async () => {
  console.log('🔄 [fetchConnectionStatus] Starting...');
  setIsLoading(true);
  setError(null);

  try {
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log('👤 [fetchConnectionStatus] User session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError
    });

    if (sessionError || !session?.user) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const userId = session.user.id;
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
      .eq('id', userId)
      .single();

    console.log('🏛️ [fetchConnectionStatus] Church query result:', {
      church,
      error: churchError,
      errorCode: churchError?.code
    });

    if (churchError && churchError.code !== 'PGRST116') {
      throw churchError;
    }

    if (church?.youtube_channel_id) {
      console.log('✅ [fetchConnectionStatus] YouTube connected:', {
        channelId: church.youtube_channel_id,
        channelName: church.youtube_channel_name
      });

      setStatus({
        isConnected: true,
        channelName: church.youtube_channel_name || undefined,
        channelThumbnail: church.youtube_channel_thumbnail || undefined,
        channelId: church.youtube_channel_id,
      });
    } else {
      console.log('❌ [fetchConnectionStatus] YouTube not connected');
      setStatus({ isConnected: false });
    }
  } catch (err) {
    console.error('💥 [fetchConnectionStatus] Error:', err);
    setError(err instanceof Error ? err.message : 'Failed to check connection status');
  } finally {
    setIsLoading(false);
    console.log('✔️ [fetchConnectionStatus] Completed');
  }
};
```

### 后端日志 (`callback/route.ts`)

```tsx
// 在第 22 行之后
export async function GET(request: NextRequest) {
  console.log('📞 [OAuth Callback] Request received:', {
    url: request.url,
    origin: request.nextUrl.origin,
    timestamp: new Date().toISOString()
  });

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('📋 [OAuth Callback] Parameters:', {
      hasCode: !!code,
      codePreview: code?.substring(0, 20) + '...',
      hasState: !!state,
      statePreview: state?.substring(0, 20) + '...',
      error
    });

    // ... 在每个关键步骤后添加类似的日志
  }
}
```

---

## 总结

这个 walkthrough 涵盖了整个 YouTube OAuth 连接流程的每一个步骤。关键要点：

1. **前端点击按钮** → 调用后端 API
2. **后端生成 OAuth URL** → 重定向到 Google
3. **用户授权** → Google 回调后端
4. **后端处理 callback** → 存储 tokens 和频道信息
5. **重定向回前端** → 刷新状态显示按钮

**最容易出问题的地方**:
1. ✅ Google Cloud Console 的 redirect URI 配置
2. ✅ Supabase Dashboard 的 Redirect URLs 配置
3. ✅ 数据库写入和查询的时序问题（500ms 延迟）
4. ✅ RLS 策略阻止查询

使用这个文档，你应该能够：
- 理解每一行代码的作用
- 知道在哪里添加日志来 debug
- 识别和修复逻辑问题
- 系统地排查连接失败的原因

如果还有问题，请告诉我具体卡在哪一步，我可以帮你深入分析！
