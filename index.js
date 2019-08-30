#!/usr/bin/env node

const request = require('request');
const cheerio = require('cheerio');
const commandLineArgs = require('command-line-args');

(async () => {
  const optionDefinitions = [
    {name: 'url', alias: 'u', type: String},
    {name: 'output', alias: 'o', type: String, defaultValue: 'web.dev'},
  ];
  const arguments = commandLineArgs(optionDefinitions);
  const {url, output} = arguments;
  try {
    if (!url || !url.startsWith('https://developers.google.com/web/')) {
      throw new RangeError(
          'The URL must start with "https://developers.google.com/web/"');
    }
  } catch (e) {
    return console.error(e);
  }

  const getMarkDown = async (article) => {
    article = article.replace(
        'https://developers.google.com/web/',
        'https://raw.githubusercontent.com/google/WebFundamentals/master/src/content/en/');
    article = article + '.md';
    return new Promise((resolve, reject) => {
      request.get(article, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          return reject(error || new Error(response.statusCode));
        }
        return resolve(body);
      });
    });
  };

  const webDevLify = (markDown) => {
    const sentinel = 'HI_THERE_I_AM_THE_SENTINEL';
    const directoryName = url.replace(/.*\/(.*?)$/, '$1');
    let cliString = `cd src/site/content/en/blog/ && mkdir ${directoryName} && cd ${directoryName} && touch index.md && `;

    const rules = {
      removeProjectPath: (s) => {
        return s.replace(/^\s*project_path:\s*.*?$/gm, '');
      },

      removeBookPath: (s) => {
        return s.replace(/^\s*book_path:\s*.*?$/gm, '');
      },

      removeBlinkComponents: (s) => {
        return s.replace(/\{#\s+wf_blink_components:\s+(.*?)\s+#\}/gm, '');
      },

      removeHelpfulWidget: (s) => {
        return s.replace(/\{%\s+include\s+"web\/_shared\/helpful\.html"\s+%\}/gm, '');
      },

      removeRSSWidget: (s) => {
        return s.replace(/\{%\s+include\s+"web\/_shared\/rss-widget-updates\.html"\s+%\}/gm, '');
      },

      convertHeading1ToTitle: (s) => {
        const regExp = new RegExp('^#\\s(.*?)$.*?', 'gm');
        const title = regExp.exec(s)[1];
        s = s.replace(regExp, '');
        s = `---\ntitle: ${title}` + s;
        return s;
      },

      convertDescription: (s) => {
        return s.replace(/^description(:\s+.*?)$/gm, `subhead$1\n${sentinel}\n---`);
      },

      convertAuthor: (s) => {
        const regExp = new RegExp('\\{%\\s+include\\s+"web\/_shared\/contributors\/(.+?)\\.html"\\s%\\}', 'gm');
        const authors = [...s.matchAll(regExp)].map(author => author[1]);
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `authors:\n  - ${authors.join('\n  - ')}\n${sentinel}`);
        return s;
      },

      convertFeaturedSnippet: (s) => {
        const regExp = new RegExp('\\{#\\s+wf_featured_snippet:\\s+(.*?)\\s+#\\}', 'gm');
        const snippet = regExp.exec(s)[1];
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `description: ${snippet}\n${sentinel}`);
        return s;
      },

      convertPublishedOn: (s) => {
        const regExp = new RegExp('\\{#\\s+wf_published_on:\\s+(\\d{4}-\\d{2}-\\d{2})\\s+#\\}', 'gm');
        const date = regExp.exec(s)[1];
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `date: ${date}\n${sentinel}`);
        return s;
      },

      convertUpdatedOn: (s) => {
        const regExp = new RegExp('\\{#\\s+wf_updated_on:\\s+(\\d{4}-\\d{2}-\\d{2})\\s+#\\}', 'gm');
        const date = regExp.exec(s)[1];
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `updated: ${date}\n${sentinel}`);
        return s;
      },

      convertTags: (s) => {
        const regExp = new RegExp('\\{#\\s+wf_tags:\\s(.*?)\\s+#\\}', 'gm');
        const tags = ['  - post # post is a required tag for the article to show up in the blog.'].concat(regExp.exec(s)[1].split(','));
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `tags:\n${tags.join('\n  - ')}\n${sentinel}`);
        return s;
      },

      convertFeaturedImage: (s) => {
        const regExp = new RegExp('\\{#\\s+wf_featured_image:\\s(.*?)\\s+#\\}', 'gm');
        const image = regExp.exec(s)[1];
        s = s.replace(regExp, '');
        s = s.replace(sentinel, `hero: # ⚠️ [TODO] Fix hero, old hero was "${image}"!\nalt: # ⚠️ [TODO] Add alt text!\n${sentinel}`);
        return s;
      },

      rewriteImageOrSourceURLs: (s) => {
        const regExp = /(<(?:img|source)\s+.*?)src="(\/web\/[^"]+)/gm;
        const urls = Array.from(new Set([...s.matchAll(regExp)].map(img => `https://developers.google.com${img[2]}`)));
        cliString += urls.map(url => {
          return `curl -o ${url.replace(/.*\/(.*?)$/, '$1')} ${url}`;
        }).join(' && ');
        return s.replace(regExp, (_, prefix, path) => {
          return `${prefix} src="${path.replace(/.*\/(.*?)$/, '$1')}`;
        });
      },

      rewriteClassAttemptLeftOrRight: (s) => {
        return s.replace(/\s+class=["']?attempt-(left|right)["']?/gm, ' class="w-figure w-figure--inline-$1" style="max-width:50%"');
      },

      rewriteCallouts: (s) => {
        return s.replace(/^(Note|Caution|Warning|Success|Key Point|Key Term|Objective|Dogfood):(\s+.+?)(?:\n\n)/gms, (_, callout, text) => {
          let newCallout;
          if (callout === 'Note') {
            newCallout = '';
          } else if (callout === 'Caution') {
            newCallout = ' caution';
          } else if (callout === 'Warning') {
            newCallout = ' warning';
          } else if (callout === 'Success') {
            newCallout = ' success';
          } else if (callout === 'Key Point') {
            newCallout = ' gotchas';
          } else if (callout === 'Key Term') {
            newCallout = ' key-term';
          } else if (callout === 'Objective') {
            newCallout = ' objective';
          } else if (callout === 'Dogfood') {
            newCallout = ' gotchas';
          }
          return `{% Aside${newCallout} %}\n ${text.replace(/\n/g, '\n  ')}\n{% endAside %}\n\n`;
        });
      },

      removeSingleLineComments: (s) => {
        return s.replace(/\{#\s+.*?\s+#\}/gm, '');
      },

      removeMultiLineComments: (s) => {
        return s.replace(/\{%\s+comment\s+%\}(?:\s|\S)+\{%\s+endcomment\s+%\}/gm, '');
      },

      removeSentinel: (s) => {
        return s.replace(new RegExp(sentinel + '\n'), '');
      },

      removeSmartQuotesAndApostrophes: (s) => {
        return s.replace(/(“|”)/gm, '"').replace(/’/gm, '\'');
      },

      removeOrphanFeedback: (s) => {
        return s.replace(/^#+\s+Feedback\s*$(?!\n)/gm, '');
      },

      moveLinkDefinitionsToTheEnd: (s) => {
        const regExp = new RegExp('^\\[.+?\\]:\\s+.+?(?:\\s+".+?")?$', 'gm');
        const definitions = [...s.matchAll(regExp)];
        s = s.replace(regExp, '');
        s += definitions.join('\n');
        return s;
      },

      removeEmptyLines: (s) => {
        return s.replace(/^\s*$\n^\s*$/gm, '');
      },
    };

    for (const name in rules) {
      markDown = rules[name](markDown);
    }
    return {markDown, cliString};
  };

  if (output === 'webfundamentals') {
    const markDown = await getMarkDown(url).catch(e => console.error(e));
    console.log(markDown);
  } else if (output === 'web.dev') {
    const markDown = await getMarkDown(url).catch(e => console.error(e));
    const result = webDevLify(markDown);
    console.log(result.markDown);
    console.log('----------');
    console.log(result.cliString);
  }
})();
