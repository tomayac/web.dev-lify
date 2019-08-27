# web.dev-lify

Helper script for the migration of content from
[Web Fundamentals](https://developers.google.com/web/) over to [web.dev](https://web.dev/).

## Usage

```bash
$ npx @web.dev-lify/web.dev-lify -u https://developers.google.com/web/updates/capabilities
```

### Parameters:

| Name | Required | Description | Example |
| --- | --- | --- | --- |
| `-u` | yes | The URL from Web Fundamentals to web.dev-lify | `https://developers.google.com/web/updates/capabilities` |
| `-o` | no | The desired output format, accepts `webfundamentals` (Web Fundamentals flavor) and `web.dev` (web.dev flavor, default) | `web.dev ` |

## License

Apache 2.0