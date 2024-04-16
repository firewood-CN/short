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

/*-- DROP TABLE IF EXISTS banSlug;
CREATE TABLE IF NOT EXISTS banSlug (
  `id` INTEGER PRIMARY KEY NOT NULL,
  `slug` TEXT,
  `create_time` TEXT DEFAULT (strftime('%Y年%m月%d日 %H:%M:%S', 'now'))
);
-- DROP TABLE IF EXISTS banIP;
CREATE TABLE IF NOT EXISTS banIP (
  `id` INTEGER PRIMARY KEY NOT NULL,
  `ip` TEXT,
  `create_time` TEXT DEFAULT (strftime('%Y年%m月%d日 %H:%M:%S', 'now'))
); */