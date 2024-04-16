# 注意

本仓库分叉于 [https://github.com/x-dr/short](https://github.com/x-dr/short) 并且已经在源代码的基础上做了修改。

**源代码使用 MIT 许可证进行授权，本经过二次修改的程序同源代码的许可证，二次分发或者修改时请保留原作者和修改作者的版权信息。**

## 介绍

一个使用 Cloudflare Pages 创建的 URL 缩短器。

*示例* : [https://dwl.pages.dev/](https://dwl.pages.dev/)


### 利用 Cloudflare Pages 部署

1. Fork 本项目 : [https://github.com/molikai-work/short](https://github.com/molikai-work/short)

2. 登录到[Cloudflare](https://dash.cloudflare.com/)控制台。

3. 在帐户主页中，选择`Workers 和 Pages`-> ` 创建应用程序` -> `Pages` -> `连接到 Git`

4. 选择你创建的项目存储库，在`设置构建和部署`部分中，全部默认即可，不需要修改框架预设、构建命令等内容。

5. 点击`保存并部署`，稍等片刻，你的网站就部署好了。

6. 创建D1数据库参考[这里](https://github.com/x-dr/telegraph-Image/blob/main/docs/manage.md)

7. 执行sql命令创建表（在控制台输入框粘贴下面语句执行即可）

```sql
DROP TABLE IF EXISTS links;
CREATE TABLE IF NOT EXISTS links (
  `id` integer PRIMARY KEY NOT NULL,
  `url` text,
  `slug` text,
  `email` text,
  `ua` text,
  `ip` text,
  `status` text,
  `hostname` text ,
  `create_time` DATE
);
DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS logs (
  `id` integer PRIMARY KEY NOT NULL,
  `url` text ,
  `slug` text,
  `referer` text,
  `ua` text ,
  `ip` text ,
  `status` text,
  `hostname` text ,
  `create_time` DATE
);
DROP TABLE IF EXISTS banUrl;
CREATE TABLE IF NOT EXISTS banUrl (
  `id` INTEGER PRIMARY KEY NOT NULL,
  `url` TEXT,
  `create_time` TEXT DEFAULT (strftime('%Y年%m月%d日 %H:%M:%S', 'now'))
);
```
8. 选择部署完成项目，前往 Cloudflare Pages 项目控制面板依次点击`设置`->`函数`->`D1 数据库绑定`->`编辑绑定`->添加变量，变量名称填写：`DB` -> D1 数据库选择 `你刚刚创建好的 D1 数据库`

9. 重新部署项目以刷新数据，完成。

### 配置环境变量

你可以在 Cloudflare Pages 项目控制面板`设置`->`环境变量`->`制作`->`为生产环境定义变量`中配置以下环境变量。

所有环境变量全部都是可选配置的，不配置则执行默认的相关函数，不影响正常使用。

| 变量名称 | 示例值 | 可选 | 介绍 |
|---------|----|------|-----|
| SHORT_DOMAINS     | example.com               | 是的 | 短链生成后的显示域名，没有变量则默认自动获取当前域名 |
| FORBIDDEN_DOMAINS | example.com,*.example.com | 是的 | 黑名单域名，支持通配，设置后在创建时该域名就会被拦截，多个用逗号分割，没有变量则默认不启用黑名单 |
| DIRECT_DOMAINS    | example.com,example.org   | 是的 | 直链域名，设置后使用该域名访问则直接 302 重定向跳转，而不是默认的 JS 跳转，多个用逗号分割，没有变量则默认不启用直链跳转 |
| ALLOW_DOMAINS     | example.com,example.org   | 是的 | 允许解析目标地址的域名白名单，设置后只能使用该域名解析目标地址，否则拒绝请求，多个用逗号分割，没有变量则默认不启用允许解析域名白名单 |

### 通过 API 生成

```bash
# POST /create
curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com"}' https://dwl.pages.dev/create

# 指定 slug
curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com","slug":"1example"}' https://dwl.pages.dev/create

# 指定 email
curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com","email":"1@example.com"}' https://dwl.pages.dev/create

```

> 响应:

```json
{
  "slug": "1example",
  "link": "http://d.131213.xyz/example"
}
```
