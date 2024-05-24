# 注意

>本仓库分叉于 [https://github.com/x-dr/short](https://github.com/x-dr/short) 并且已经在源代码的基础上做了修改。

>源代码使用 MIT 许可证进行授权，本经过二次修改的程序同源代码的许可证，二次分发或者修改时请保留原作者和修改作者的版权信息。

问题反馈请提交 `issues` 或者直接联系 `info@molikai.work`。

***现有的数据库数据表处理项已更新，原 `1.0` 版本的使用请手动使用命令在 `links` 数据表添加一项 `email`***

"ALTER TABLE "links" ADD "email" TEXT;"

## 介绍

一个使用 Cloudflare Pages 创建的 URL 缩短器。

*可靠的短链示例* : [https://c1n.top/](https://c1n.top/)


### 利用 Cloudflare Pages 部署

1. Fork 分叉本项目 : [https://github.com/molikai-work/short](https://github.com/molikai-work/short)。

2. 登录到[Cloudflare](https://dash.cloudflare.com/)控制台。

3. 在帐户主页中，选择`Workers 和 Pages`-> ` 创建应用程序` -> `Pages` -> `连接到 Git`。（Cloudflare 支持多种语言，推荐将语言显示设置为与本教程相同的语言）

4. 选择你创建的项目存储库，在 `设置构建和部署` 部分中，全部默认即可，不需要修改框架预设、构建命令等内容。

5. 点击 `保存并部署` ，稍等片刻，你的网站就部署好了。

6. 创建D1数据库参考[这里](https://github.com/x-dr/telegraph-Image/blob/main/docs/manage.md)。

7. 在数据库控制台输入框粘贴下面语句（或使用根目录的 `short.sql` 文件）执行 `SQLite` 的命令创建表执行即可。

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
  `create_time` TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))

);
CREATE UNIQUE INDEX links_index ON links(slug);
CREATE INDEX logs_index ON logs(slug);
CREATE UNIQUE INDEX banUrl_index ON banUrl(url);
```
8. 选择部署完成项目，前往 Cloudflare Pages 项目控制面板依次点击`设置`->`函数`->`D1 数据库绑定`->`编辑绑定`->添加变量，变量名称填写：`DB` -> D1 数据库选择 `你刚刚创建好的 D1 数据库`

9. 重新部署项目以刷新数据，完成。

### 配置数据表

你可以向 Cloudflare 的 D1 数据库的已创建短链数据库中的 `banUrl` 数据表添加数据以设置黑名单域名。

在此数据表中的域名均无法创建/解析短链。

请直接在数据表的 `url` 项添加要加黑名单的一级域名，如 `example.com` ，其他的数据项会自动填写。

### 配置环境变量

你可以在 Cloudflare Pages 项目控制面板`设置`->`环境变量`->`制作`->`为生产环境定义变量`中配置以下环境变量。

所有环境变量全部都是可选配置的，不配置则执行默认的相关函数，不影响正常使用。

| 变量名称 | 示例值 | 可选 | 介绍 |
|---------|----|------|-----|
| SHORT_DOMAINS     | example.com               | 是的 | 短链生成后的显示域名，没有变量则默认自动获取当前域名 |
| DIRECT_DOMAINS    | example.com,example.org   | 是的 | 直链域名，设置后使用该域名访问则直接 302 重定向跳转，而不是默认的 JS 跳转，多个用逗号分割，没有变量则默认不启用直链跳转 |
| ALLOW_DOMAINS     | example.com,example.org   | 是的 | 允许解析目标地址的域名白名单，设置后只能使用该域名解析目标地址，否则拒绝请求，多个用逗号分割，没有变量则默认不启用允许解析域名白名单 |

### 通过 API 生成

```bash
# POST /create
curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com"}' https://d.131213.xyz/create

# 指定slug
curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com","slug":"example"}' https://d.131213.xyz/create

```

> 响应:

```json
{
  "slug": "example",
  "link": "http://d.131213.xyz/example"
}
```

### 数据表解释

> 表 `links` 短链记录

- id  = 行数据在数据表中的唯一记录 ID
- url = 短链的目标 URL
- slug = 短链对应的唯一短 ID
- email = 用户可选提交的 Email 地址
- ua = 用户的浏览器标识（注：此数据依靠客户端标头，可篡改）
- ip = 用户的 IP 地址
- status = 短链的状态，默认为“1”，“-1”或“ban”为封禁、“1”为正常、“2”或“skip”为跳过黑名单
- hostname = 用户生成短链访问的主机名
- create_time = 短链生成时间

>表 `logs` 短链访问记录

- id = 行数据在数据表中的唯一记录 ID
- url = 访问的短链的目标 URL
- slug = 访问的短链对应的唯一短 ID
- referer = 访问短链的用户来源（注：此数据依靠客户端标头，可篡改）
- ua = 访问的用户的浏览器标识（注：此数据依靠客户端标头，可篡改）
- ip = 访问的用户的 IP 地址
- status = 访问的短链的状态，默认为“1”，“-1”或“ban”为封禁、“1”为正常、“2”或“skip”为跳过黑名单
- hostname = 用户访问短链所访问的主机名
- create_time = 用户访问短链的时间

>表 `banUrl` 域名黑名单

- id = 行数据在数据表中的唯一记录 ID
- url = 黑名单域名
- create_time = 黑名单添加时间
