/*
 * Copyright (c) molikai-work (2024)
 * molikai-work 的特定修改和新增部分
 * 根据 MIT 许可证发布
 */

// Path: functions/create.js

// 生成随机字符串
function generateRandomString(length) {
    const characters = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    // 将随机的首字符固定为 - ，区分随机和自定义
    result += "-";

    for (let i = 1; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}

// 处理创建短链接的请求
export async function onRequest(context) {
    // 设置跨域请求
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // 获取各种数据
    const { request, env } = context;
    const originurl = new URL(request.url);
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("clientIP");
    const userAgent = request.headers.get("user-agent");
    const origin = `${originurl.protocol}//${originurl.hostname}`

    const hostName = request.headers.get('host');

    const options = {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };

    // 获取当前时间
    const timedata = new Date();

    // 根据语言 zh-CN 格式化日期
    const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

    // 从 JSON 数据中解构出 url 和 slug
    const { url, slug, email } = await request.json();

    // 定义 CORS 相关的响应头部信息
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // 允许任意来源的跨域请求
        'Access-Control-Allow-Headers': 'Content-Type', // 允许请求头部中包含 Content-Type
        'Access-Control-Max-Age': '86400', // 预检请求的有效期为 86400 秒
    };

    if (!url) return Response.json({ message: '缺少必需的 URL 参数。- H400' });

    // url 格式检查
    if (!/^(https?):\/\/.{3,}/.test(url)) {
        return Response.json({ message: 'URL 格式不合规范。- H400' }, {
            headers: corsHeaders,
            status: 400
        })
    }

    // 自定义slug长度检查 4<slug<8 是否不以文件后缀结尾、含有特殊字符
    if (slug && (slug.length < 4 || slug.length > 8 || /^\.[a-zA-Z]|^[a-zA-Z]|[^.\w\u4E00-\u9FA5]|\..+\.[a-zA-Z]+$|(\.[a-zA-Z]+)$|(\.)$/.test(slug))) {
        return Response.json({ message: 'Slug 4-8位且不能以点(字母)开头或结束、含有特殊字符和文件扩展名。- H400' }, {
            headers: corsHeaders,
            status: 400
        });
    }

    // email 格式检查
    if (email && !/^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return Response.json({ message: 'Email 格式不合规范。- H400' }, {
            headers: corsHeaders,
            status: 400
        })
    }

    try {
        const bodyUrl = new URL(url); // 获取链接中的域名

        let customOrigin;

        // 读取环境变量自定义短链接域名
        if (!env.SHORT_DOMAINS) {
            customOrigin = origin;
        } else {
            customOrigin = `http://${env.SHORT_DOMAINS}`;
        }

        // 检查环境变量是否存在
        if (!env.FORBIDDEN_DOMAINS) {
            // 环境变量不存时跳过代码执行
        } else {
            // 读取环境变量域名黑名单
            const forbiddenDomains = env.FORBIDDEN_DOMAINS.split(',');

            // 检查黑名单中的域名是否有通配符
            function isWildcardDomain(domain) {
                return domain.startsWith('*.');
            }

            // 检查是否是通配符域名的子域名 (兼容多级域名的通配符)
            /*function isWildcardDomain(domain) {
                const parts = domain.split('.');
                return parts.length > 2 && parts[0] === '*' && parts[1] === '';
            }*/

            // 检查是否是通配符域名的子域名
            function isSubdomain(subdomain, domain) {
                return subdomain.endsWith('.' + domain);
            }

            // 判断是否应该封禁该域名
            function shouldBlockDomain(blacklistedDomain, hostname) {
                if (isWildcardDomain(blacklistedDomain)) {
                    const domain = blacklistedDomain.slice(2); // 移除 *. 前缀
                    return isSubdomain(hostname, domain);
                } else {
                    return hostname === blacklistedDomain;
                }
            }

            // 检查请求的域名是否在黑名单中
            if (forbiddenDomains.some(blacklistedDomain => shouldBlockDomain(blacklistedDomain, bodyUrl.hostname))) {
                return Response.json({ message: '此域在黑名单中。- H403' }, {
                    headers: corsHeaders,
                    status: 403
                });
            }
        }

        // 如果自定义slug
        if (slug) {
            const existUrl = await env.DB.prepare(`SELECT url as existUrl FROM links where slug = '${slug}'`).first()

            // url & slug 是一样的。
            if (existUrl && existUrl.existUrl === url) {
                return Response.json({ message: '该链接及 Slug 已存在。- H409' }, {
                    headers: corsHeaders,
                    status: 409
                })
            }

            // slug 已存在
            if (existUrl) {
                return Response.json({ message: '自定义 Slug 已被使用。- H409' }, {
                    headers: corsHeaders,
                    status: 409
                })
            }
        }

        // 目标 url 已存在
        const existSlug = await env.DB.prepare(`SELECT slug as existSlug FROM links where url = '${url}'`).first()

        // url 存在且没有自定义 slug 和 email
        if (existSlug && !slug && !email) {
            // 返回生成的短链
            return Response.json({
                code: 200,
                msg: "success",
                time: Date.now(),
                url: `${url}`,
                slug: existSlug.existSlug,
                link: `${customOrigin}/${existSlug.existSlug}`
            }, {
                headers: corsHeaders,
                status: 200
            })
        }

        // 检查环境变量是否存在
        if (!env.FORBIDDEN_DOMAINS) {
            // 检查是否指向相同域名(获取当前域名)
            if (bodyUrl.hostname === hostName) {
                return Response.json({ message: '您不能缩短指向同一域的链接。- H403' }, {
                    headers: corsHeaders,
                    status: 403
                })
            }
        } else {
            // 检查是否指向相同域名(允许解析的域名)
            const allowDomains = env.ALLOW_DOMAINS.split(',');
            if (allowDomains.includes(bodyUrl.hostname)) {
                return Response.json({ message: '您不能缩短指向同一域的链接。- H403' }, {
                    headers: corsHeaders,
                    status: 403
                })
            }
        }

        // 生成随机 slug
        const generatedSlug = slug ? slug : generateRandomString(5); // 长度为5的随机字符串

        // 插入数据到数据库
        const info = await env.DB.prepare(`INSERT INTO links (url, slug, email, ip, status, ua, hostname, create_time)
        VALUES ('${url}', '${generatedSlug}', '${email}', '${clientIP}', 'ok', '${userAgent}', '${hostName}', '${formattedDate}')`).run()

        // 返回短链接信息
        return Response.json({ slug: generatedSlug, link: `${customOrigin}/${generatedSlug}` }, {
            headers: corsHeaders,
            status: 200
        })
    } catch (e) {
        // 处理异常情况
        return Response.json({ message: e.message }, {
            headers: corsHeaders,
            status: 500
        })
    }
}
