# web.dev-lify

Helper script for the migration of content from
[Web Fundamentals](https://developers.google.com/web/) over to [web.dev](https://web.dev/).

## Usage

Pass a Web Fundamentals URL:

```bash
$ npx @web.dev-lify/web.dev-lify -u https://developers.google.com/web/updates/capabilities
```

If this fails, pass a *raw* GitHub URL:

```bash
$ npx @web.dev-lify/web.dev-lify -u https://raw.githubusercontent.com/google/WebFundamentals/master/src/content/en/updates/capabilities.md
```

Make sure to run this from the web.dev root folder.
The output of the script is twofold:

```
[ Markdown of the article to migrate                                    ]
----------
[ Bash commands to bootstrap your web.dev PR that perform these steps:  ]
[ - Create a folder.                                                    ]
[ - Copy images over from WebFu.                                        ]
[ - Create an index.md file.                                            ]
[ You then just need to copy the Markdown part in the index.md file.    ]
```

### Parameters:

| Name | Required | Description | Example |
| --- | --- | --- | --- |
| `-u` | yes | The URL from Web Fundamentals to web.dev-lify | `https://developers.google.com/web/updates/capabilities` |
| `-o` | no | The desired output format, accepts `webfundamentals` (Web Fundamentals flavor) and `web.dev` (web.dev flavor, default) | `web.dev ` |

## License

Apache 2.0