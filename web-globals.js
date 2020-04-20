const URL = require('url').URL
// eslint-disable-next-line no-unused-vars
const URLSearchParams = require('url').URLSearchParams

const location = new Proxy(
  (() => {
    let _url = new URL(global.__dirname + '/')
    _url.search = new URLSearchParams(global.sparkQueryParams)
    if (global.sparkHash) _url.hash = global.sparkHash
    return _url
  })(),
  {
    get: (obj, prop) => obj[prop],
    set: (obj, prop, value) => {
      obj[prop] = value
      if (prop === 'hash') window.dispatchEvent(new Event('hashchange'))
      return true
    },
  }
)

// eslint-disable-next-line no-unused-vars
class Event extends String {}

class EventTarget extends require('events') {
  addEventListener(type, listener) {
    this.addListener(type, listener)
  }

  removeEventListener(type, listener) {
    this.removeListener(type, listener)
  }

  dispatchEvent(event) {
    this.emit(event)
  }
}

const relative2absolute = (url) => {
  if (/^\/\//.test(url)) return window.location.protocol + url
  if (/^\//.test(url)) return window.location.origin + url
  if (!/^(?:https?:)/i.test(url)) return require('url').resolve(window.location.toString(), url)
  return url
}

const globalsHandler = {
  get: (obj, prop) => {
    if (prop in obj) return obj[prop]
    else if (prop in global) return global[prop]
    else if (typeof prop === 'string')
      return eval(`typeof ${prop} !== 'undefined' ? ${prop} : undefined`)
  },
  set: (obj, prop, value) => {
    if (typeof prop === 'string' && eval(`typeof ${prop} !== 'undefined'`)) eval(`${prop} = value`)
    else obj[prop] = value
    return true
  },
}

const window = new Proxy(
  new (class SparkWindow extends EventTarget {
    constructor() {
      super()
      this.enableSparkGL1080 =
        global.sparkscene.capabilities &&
        global.sparkscene.capabilities.sparkgl &&
        global.sparkscene.capabilities.sparkgl.supports1080 &&
        location.searchParams.has('enableSparkGL1080')
    }

    get innerWidth() {
      return this.enableSparkGL1080 ? 1920 : global.sparkscene.w
    }

    get innerHeight() {
      return this.enableSparkGL1080 ? 1080 : global.sparkscene.h
    }

    get location() {
      return location
    }

    get localStorage() {
      return localStorage
    }

    get clearTimeout() {
      return clearTimeout
    }

    get setTimeout() {
      return setTimeout
    }
  })(),
  globalsHandler
)

// eslint-disable-next-line no-unused-vars
const document = new Proxy(
  new (class SparkDocument extends EventTarget {
    constructor() {
      super()
      this.head = { appendChild: () => {} }
      this.body = { appendChild: () => {} }
      this.fonts = { add: () => {} }
    }

    get location() {
      return location
    }

    createElement(tagName) {
      if (tagName === 'style') {
        return { sheet: { insertRule: () => {} }, appendChild: () => {} }
      } else if (tagName === 'script') {
        return new SparkScript()
      } else if (tagName === 'link') {
        return {}
      } else if (tagName === 'video') {
        return new SparkVideo()
      }
    }

    createTextNode() {
      return {}
    }

    getElementById() {
      return null
    }

    querySelector(selectors) {
      let found = selectors.match(/script\[src\*?=["'](.*)["']]/i)
      if (found) {
        let src = found[1]
        if (global.bootstrap) {
          if (global.bootstrap.applicationURL.indexOf(src) !== -1) {
            return { getAttribute: (attributeName) => global.bootstrap[attributeName] }
          }
        }
      }
      console.warn(`document.querySelector(${selectors}) isn't supported`)
      return null
    }

    getElementsByTagName() {
      return []
    }
  })(),
  globalsHandler
)

// eslint-disable-next-line no-unused-vars
class XMLHttpRequest extends EventTarget {
  constructor() {
    super()
    this.readyState = 0
  }

  open(method, URL) {
    this._method = method
    this._URL = relative2absolute(URL)
    this.readyState = 1
  }

  send(body) {
    let self = this
    fetch(this._URL, { method: this._method, body: body }).then((r) => {
      self.status = r.status
      self.readyState = 4
      self.responseText = r._bodyText.toString()
      if (self.onreadystatechange) self.onreadystatechange()
    })
  }
}

// eslint-disable-next-line no-unused-vars
class FontFace {
  // eslint-disable-next-line no-unused-vars
  constructor(family, source, descriptors) {
    let m = source.match(/\((.*)\)/)
    this._url = m ? m[1] : m
  }

  load() {
    let fontResource = global.sparkscene.create({ t: 'fontResource', url: this._url })
    return fontResource.ready
  }
}

class SparkScript {
  set onload(callback) {
    this._onload = callback
  }

  set load(b) {
    this._load = b
  }

  set src(url) {
    url = relative2absolute(url)

    if (this._load) {
      let self = this
      fetch(url).then((r) => {
        if (r.status >= 200 && r.status <= 299) {
          global.vm.runInThisContext(r._bodyText.toString())
          self._onloaded()
        } else {
          console.log(`HTTP ${r.status} for '${url}'`)
        }
      })
    } else {
      this._onloaded()
    }
  }

  _onloaded() {
    let self = this
    setImmediate(() => {
      if (self._onload) self._onload()
    })
  }
}

class SparkVideo extends EventTarget {
  constructor() {
    super()

    let _this = this
    this.style = {
      set visibility(v) {
        _this.videoEl.a = v === 'hidden' ? 0 : 1
      },
      set left(v) {
        _this.videoEl.x = v
      },
      set top(v) {
        _this.videoEl.y = v
      },
      set width(v) {
        _this.videoEl.w = v
      },
      set height(v) {
        _this.videoEl.h = v
      },
    }

    let proxyServer = ''
    if (global.sparkQueryParams && global.sparkQueryParams.sparkVideoProxyServer) {
      proxyServer = global.sparkQueryParams.sparkVideoProxyServer
    }
    this.videoEl = global.sparkscene.create({
      t: 'video',
      id: 'video-player',
      proxy: proxyServer,
    })
    this._registerListeners()

    global.sparkscene.on('onClose', () => _this.videoEl.stop())
  }

  // ----- F u n c t i o n s
  getAttribute(a) {
    if (a === 'src') return this.src
  }

  setAttribute(a, v) {
    if (a === 'src') this.src = v
    else if (a === 'id') this.id = v
  }

  removeAttribute(a) {
    if (a === 'src') this.videoEl.stop()
  }

  load() {}

  play() {
    this.videoEl.speed = 1
  }

  pause() {
    this.videoEl.pause()
  }

  // ----- P r o p e r t i e s
  get currentTime() {
    return this.videoEl.position
  }

  set currentTime(v) {
    this.videoEl.position = v
  }

  get duration() {
    return this.videoEl.duration
  }

  get muted() {
    return this.videoEl.muted
  }

  set muted(v) {
    this.videoEl.muted = v
  }

  get loop() {
    return this.videoEl.loop
  }

  set loop(v) {
    this.videoEl.loop = v
  }

  get src() {
    return this.videoEl.url
  }

  set src(v) {
    this.videoEl.url = v
    this.videoEl.play()
    this.dispatchEvent('canplay')
  }

  // ----- E v e n t s
  _supportedEvents() {
    return ['onProgressUpdate', 'onPlaybackStarted', 'onEndOfStream', 'onPlayerStateChanged']
  }

  _registerListeners() {
    this._supportedEvents().forEach((event) => {
      this.videoEl.on(event, this[event].bind(this))
    })
  }

  onEndOfStream() {
    this.dispatchEvent('ended')
  }

  onProgressUpdate() {
    this.dispatchEvent('timeupdate')
  }

  onPlaybackStarted() {
    this.dispatchEvent('playing')
    this.dispatchEvent('play')
  }

  onPlayerStateChanged(event) {
    let prevState = this.playerState
    this.playerState = event.state

    switch (this.playerState) {
      case 0: // IDLE
        break
      case 1: // INITIALIZING
        this.dispatchEvent('loadstart')
        break
      case 2: // INITIALIZED
      case 3: // PREPARING
        break
      case 4: // PREPARED
        this.dispatchEvent('loadeddata')
        break
      case 5: // BUFFERING
        break
      case 6: // PAUSED
        this.dispatchEvent('pause')
        break
      case 7: // SEEKING
        this.dispatchEvent('seeking')
        break
      case 8: // PLAYING
        if (prevState === 6) this.dispatchEvent('play')
        else {
          if (prevState === 7) this.dispatchEvent('seeked')
          this.dispatchEvent('playing')
        }
        break
      case 9: // STOPPING
      case 10: // STOPPED
        break
      case 11: // COMPLETE
        this.dispatchEvent('ended')
        break
      case 12: // ERROR
        this.dispatchEvent('error')
        break
      case 13: // RELEASED
        break
    }
  }
}
