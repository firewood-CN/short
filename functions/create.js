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

    // 定义 CORS 相关的响应头部信息
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };

    // 获取客户端 IP、IP 来源地址、用户代理、Referer 和主机名等信息
    const { request, env } = context;
    const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || request.headers.get("clientIP");
    const countryIP = request.headers.get("CF-IPCountry")
    const userAgent = request.headers.get("user-agent");

    const originurl = new URL(request.url);
    const origin = `${originurl.protocol}//${originurl.hostname}` // 获取 "请求协议//请求主机名"

    const hostName = request.headers.get('host');

    // 如果请求的主机名不是原 API 的主机名
    if (!env.SHORT_DOMAINS) {
        // 环境变量不存时跳过代码执行
    } else if (hostName !== `${env.SHORT_DOMAINS}`) {
        // 构建重定向 URL
/*        const redirectURL = `https://${env.SHORT_DOMAINS}/create`;

        // 返回重定向响应
        return Response.redirect(redirectURL, 307);*/

        return new Response(null, {
            headers: corsHeaders,
            status: 403
        });
    }

    // 配置日期格式选项
/*    const options = {
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
*/

    const formattedDate = new Date().toISOString();

    // 从 JSON 数据中解构出 url 和 slug
    const { url, slug, email } = await request.json();

    // 开始进入参数检查
    // 1. 必须有 URL 参数 ------------------------------
    if (!url) return Response.json({ message: '缺少必需的 URL 参数。- H400' });

    // 2. URL 必须符合要求 ------------------------------
    // url 格式检查
    if (!/^(https?):\/\/.{3,}/.test(url)) {
        return Response.json({ message: 'URL 格式不合规范。- H400' }, {
            headers: corsHeaders,
            status: 400
        })
    }

    // 3. URL 的顶级域名必须允许 ------------------------------
    const levelDomain = new URL(url).hostname.split('.').pop();
    // 检查顶级域名是否允许
    if (levelDomain === 'gov' || levelDomain === 'edu' || levelDomain === 'adult') {
        return Response.json({ message: '禁止缩短的特定顶级域名。- H403' }, {
            headers: corsHeaders,
            status: 403
        });
    }

    // 4. URL 必须不在黑名单中 ------------------------------
    // 提取原 URL 的一级域名部分
    const urlHostname = new URL(url).hostname.split('.').slice(-2).join('.');

    // 查询 banUrl 表是否存在该一级域名
    const banUrlQueryResult = await env.DB.prepare(`
        SELECT id AS id
        FROM banUrl 
        WHERE url = '${urlHostname}'
    `).first();

    // 如果存在 banUrl 记录，则返回 403
    if (banUrlQueryResult) {
        return Response.json({ message: '禁止缩短的黑名单域。- H403' }, {
            headers: corsHeaders,
            status: 403
        });
    }

    // 5. 自定义的 Slug 必须符合要求 ------------------------------
    // 自定义 Slug 长度检查 4<slug<8 是否不以文件后缀结尾、含有特殊字符
    if (slug && (slug.length < 4 || slug.length > 8 || /^\.[a-zA-Z]|^[a-zA-Z]|[^.\w\u4E00-\u9FA5]|\..+\.[a-zA-Z]+$|(\.[a-zA-Z]+)$|(\.)$/.test(slug))) {
        return Response.json({ message: 'Slug 4-8位且不能以点(字母)开头或结束、含有特殊字符和文件扩展名。- H400' }, {
            headers: corsHeaders,
            status: 400
        });
    }

    // 6. 如果有 Email 那么必须符合要求 ------------------------------
    // Email 格式检查
    if (email && !/^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return Response.json({ message: 'Email 格式不合规范。- H400' }, {
            headers: corsHeaders,
            status: 400
        })
    }
// 进入参数检查结束

    try {
        const bodyUrl = new URL(url); // 获取链接中的域名

        let customOrigin;

        // 读取环境变量自定义短链接域名
        if (!env.SHORT_DOMAINS) {
            customOrigin = origin;
        } else {
            customOrigin = `https://${env.SHORT_DOMAINS}`;
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
        if (!env.ALLOW_DOMAINS) {
            // 检查是否指向相同当前域名
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
        const generatedSlug = slug ? slug : generateRandomString(5); // 长度为 5 的随机字符串

        // 插入数据到数据库
        const info = await env.DB.prepare(`INSERT INTO links (url, slug, email, ip, status, ua, hostname, create_time)
        VALUES ('${url}', '${generatedSlug}', '${email}', '${clientIP}/${countryIP}', 'ok', '${userAgent}', '${hostName}', '${formattedDate}')`).run()

        // 返回短链接信息
        return Response.json({ slug: generatedSlug, link: `${customOrigin}/${generatedSlug}` }, {
            headers: corsHeaders,
            status: 200
        })
    } catch (e) {
        // 错误处理
        return Response.json({
            code: 500,
            msg: "error",
            time: Date.now(),
            message: e.message
        }, {
            headers: corsHeaders,
            status: 500
        })
    }
}
