import Document, { Head, Html, Main, NextScript } from "next/document"

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function getInitialTheme() {
                    const storedTheme = window.localStorage.getItem('theme');
                    if (storedTheme) {
                      return storedTheme;
                    }
                    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    return prefersDarkMode ? 'dark' : 'light';
                  }
                  const theme = getInitialTheme();
                  document.documentElement.style.setProperty('color-scheme', theme);
                  document.documentElement.setAttribute('data-theme', theme);
                })();
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
