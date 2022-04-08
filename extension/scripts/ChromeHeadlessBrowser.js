const debug = require('debug')('web-scraper-headless:chrome-headless-browser')
const {ExecutionContext} = require('puppeteer/lib/ExecutionContext')
const contentSraperBundler = require('../content_script/contentScraperHeadlessBundler')
const jqueryDeferred = require('jquery-deferred')
const whenCallSequentially = require('../assets/jquery.whencallsequentially')

const vanillaPuppeteer = require('puppeteer')
const {addExtra} = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const puppeteer = addExtra(vanillaPuppeteer)
puppeteer.use(StealthPlugin())

class ChromeHeadlessBrowser {
  constructor (options) {
    this.pageLoadDelay = options.pageLoadDelay
    console.log("right before puppeteer")
    // constructors cannot handle asynchronous
    this.browserPromise = puppeteer.launch({
      headless: true,
      args: options.chromeArgs
    })
    console.log("right aftah puppeteer")
    this.proxy = options.proxy.auth? {auth:options.proxy.auth }: null
    this.pagePromise = this.browserPromise.then(function (browser) {
      return browser.newPage()
    })

  }
  async loadUrl (url) {
    debug('Loading url', url)
    const page = await this.pagePromise
    if(this.proxy.auth) {
      await page.authenticate({username: this.proxy.auth.username, password: this.proxy.auth.password});
    }
    await page.goto(url, {waitUntil: 'networkidle0', timeout:120000})
  }
  async close () {
    try {
      const browser = await this.browserPromise
      await browser.close()
    } catch (e) {
      console.error(e)
    }
  }
  saveImages (record, namingFunction) {
    var deferredResponse = jqueryDeferred.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length
    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        throw new Error('Downloading images is not yet supported')
      }
    }
    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  }
  async fetchData (url, sitemap, parentSelectorId, callback, scope) {
    try {
      const page = await this.pagePromise
      await this.loadUrl(url)

      const mainFrame = page.mainFrame()

      // Maybe we don't need a context each time?
      const isolatedWorldInfo = await page._client.send('Page.createIsolatedWorld', {frameId: mainFrame._id, worldName: 'web-scraper-headless'})
      const executionContextId = isolatedWorldInfo.executionContextId
      const JsHandleFactory = page._frameManager.createJSHandle.bind(page._frameManager, executionContextId)

      const executionContext = new ExecutionContext(page._client, {id: executionContextId}, JsHandleFactory)

      const bundle = await contentSraperBundler.getBundle()
      await executionContext.evaluate(bundle)
      const message = {
        extractData: true,
        sitemap: JSON.parse(JSON.stringify(sitemap)),
        parentSelectorId: parentSelectorId
      }

      const data = await executionContext.evaluate(function (message) {
        return new Promise(function (resolve, reject) {
          window.webScraper(message, null, function (data) {
            resolve(data)
          })
        })
      }, message)
      callback.call(scope, null, data)
    } catch (e) {
      console.log(e)
      return callback(e)
    }
  }
}

module.exports = ChromeHeadlessBrowser
