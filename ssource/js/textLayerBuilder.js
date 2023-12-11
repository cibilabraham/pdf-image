
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventBus = function () {
    function EventBus() {
        var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref7$dispatchToDOM = _ref7.dispatchToDOM,
            dispatchToDOM = _ref7$dispatchToDOM === undefined ? false : _ref7$dispatchToDOM;

        _classCallCheck(this, EventBus);

        this._listeners = Object.create(null);
        this._dispatchToDOM = dispatchToDOM === true;
    }

    _createClass(EventBus, [{
        key: 'on',
        value: function on(eventName, listener) {
            var eventListeners = this._listeners[eventName];
            if (!eventListeners) {
                eventListeners = [];
                this._listeners[eventName] = eventListeners;
            }
            eventListeners.push(listener);
        }
    }, {
        key: 'off',
        value: function off(eventName, listener) {
            var eventListeners = this._listeners[eventName];
            var i = void 0;
            if (!eventListeners || (i = eventListeners.indexOf(listener)) < 0) {
                return;
            }
            eventListeners.splice(i, 1);
        }
    }, {
        key: 'dispatch',
        value: function dispatch(eventName) {
            var eventListeners = this._listeners[eventName];
            if (!eventListeners || eventListeners.length === 0) {
                if (this._dispatchToDOM) {
                    var _args5 = Array.prototype.slice.call(arguments, 1);
                    this._dispatchDOMEvent(eventName, _args5);
                }
                return;
            }
            var args = Array.prototype.slice.call(arguments, 1);
            eventListeners.slice(0).forEach(function (listener) {
                listener.apply(null, args);
            });
            if (this._dispatchToDOM) {
                this._dispatchDOMEvent(eventName, args);
            }
        }
    }, {
        key: '_dispatchDOMEvent',
        value: function _dispatchDOMEvent(eventName) {
            var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (!this._dispatchToDOM) {
                return;
            }
            var details = Object.create(null);
            if (args && args.length > 0) {
                var obj = args[0];
                for (var key in obj) {
                    var value = obj[key];
                    if (key === 'source') {
                        if (value === window || value === document) {
                            return;
                        }
                        continue;
                    }
                    details[key] = value;
                }
            }
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent(eventName, true, true, details);
            document.dispatchEvent(event);
        }
    }]);

    return EventBus;
}();

var TextLayerBuilder = function () {
    function TextLayerBuilder(_ref) {
        var textLayerDiv = _ref.textLayerDiv,
            eventBus = _ref.eventBus,
            pageIndex = _ref.pageIndex,
            viewport = _ref.viewport,
            _ref$findController = _ref.findController,
            findController = _ref$findController === undefined ? null : _ref$findController,
            _ref$enhanceTextSelec = _ref.enhanceTextSelection,
            enhanceTextSelection = _ref$enhanceTextSelec === undefined ? false : _ref$enhanceTextSelec;

        _classCallCheck(this, TextLayerBuilder);

        this.textLayerDiv = textLayerDiv;
        this.eventBus = eventBus || (0, _dom_events.getGlobalEventBus)();
        this.textContent = null;
        this.textContentItemsStr = [];
        this.textContentStream = null;
        this.renderingDone = false;
        this.pageIdx = pageIndex;
        this.pageNumber = this.pageIdx + 1;
        this.matches = [];
        this.viewport = viewport;
        this.textDivs = [];
        this.findController = findController;
        this.textLayerRenderTask = null;
        this.enhanceTextSelection = enhanceTextSelection;
        this._boundEvents = Object.create(null);
        this._bindEvents();
        this._bindMouse();
    }

    _createClass(TextLayerBuilder, [{
        key: '_finishRendering',
        value: function _finishRendering() {
            this.renderingDone = true;
            if (!this.enhanceTextSelection) {
                var endOfContent = document.createElement('div');
                endOfContent.className = 'endOfContent';
                this.textLayerDiv.appendChild(endOfContent);
            }
            this.eventBus.dispatch('textlayerrendered', {
                source: this,
                pageNumber: this.pageNumber,
                numTextDivs: this.textDivs.length
            });
        }
    }, {
        key: 'render',
        value: function render() {
            var _this = this;

            var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

            if (!(this.textContent || this.textContentStream) || this.renderingDone) {
                return;
            }
            this.cancel();
            this.textDivs = [];
            var textLayerFrag = document.createDocumentFragment();
            this.textLayerRenderTask = (0, pdfjsLib.renderTextLayer)({
                textContent: this.textContent,
                textContentStream: this.textContentStream,
                container: textLayerFrag,
                viewport: this.viewport,
                textDivs: this.textDivs,
                textContentItemsStr: this.textContentItemsStr,
                timeout: timeout,
                enhanceTextSelection: this.enhanceTextSelection
            });
            this.textLayerRenderTask.promise.then(function () {
                _this.textLayerDiv.appendChild(textLayerFrag);
                _this._finishRendering();
                _this.updateMatches();
            }, function (reason) { });
        }
    }, {
        key: 'cancel',
        value: function cancel() {
            if (this.textLayerRenderTask) {
                this.textLayerRenderTask.cancel();
                this.textLayerRenderTask = null;
            }
        }
    }, {
        key: 'setTextContentStream',
        value: function setTextContentStream(readableStream) {
            this.cancel();
            this.textContentStream = readableStream;
        }
    }, {
        key: 'setTextContent',
        value: function setTextContent(textContent) {
            this.cancel();
            this.textContent = textContent;
        }
    }, {
        key: 'convertMatches',
        value: function convertMatches(matches, matchesLength) {
            var i = 0;
            var iIndex = 0;
            var textContentItemsStr = this.textContentItemsStr;
            var end = textContentItemsStr.length - 1;
            var queryLen = this.findController === null ? 0 : this.findController.state.query.length;
            var ret = [];
            if (!matches) {
                return ret;
            }
            for (var m = 0, len = matches.length; m < len; m++) {
                var matchIdx = matches[m];
                while (i !== end && matchIdx >= iIndex + textContentItemsStr[i].length) {
                    iIndex += textContentItemsStr[i].length;
                    i++;
                }
                if (i === textContentItemsStr.length) {
                    console.error('Could not find a matching mapping');
                }
                var match = {
                    begin: {
                        divIdx: i,
                        offset: matchIdx - iIndex
                    }
                };
                if (matchesLength) {
                    matchIdx += matchesLength[m];
                } else {
                    matchIdx += queryLen;
                }
                while (i !== end && matchIdx > iIndex + textContentItemsStr[i].length) {
                    iIndex += textContentItemsStr[i].length;
                    i++;
                }
                match.end = {
                    divIdx: i,
                    offset: matchIdx - iIndex
                };
                ret.push(match);
            }
            return ret;
        }
    }, {
        key: 'renderMatches',
        value: function renderMatches(matches) {
            if (matches.length === 0) {
                return;
            }
            var textContentItemsStr = this.textContentItemsStr;
            var textDivs = this.textDivs;
            var prevEnd = null;
            var pageIdx = this.pageIdx;
            var isSelectedPage = this.findController === null ? false : pageIdx === this.findController.selected.pageIdx;
            var selectedMatchIdx = this.findController === null ? -1 : this.findController.selected.matchIdx;
            var highlightAll = this.findController === null ? false : this.findController.state.highlightAll;
            var infinity = {
                divIdx: -1,
                offset: undefined
            };
            function beginText(begin, className) {
                var divIdx = begin.divIdx;
                textDivs[divIdx].textContent = '';
                appendTextToDiv(divIdx, 0, begin.offset, className);
            }
            function appendTextToDiv(divIdx, fromOffset, toOffset, className) {
                var div = textDivs[divIdx];
                var content = textContentItemsStr[divIdx].substring(fromOffset, toOffset);
                var node = document.createTextNode(content);
                if (className) {
                    var span = document.createElement('span');
                    span.className = className;
                    span.appendChild(node);
                    div.appendChild(span);
                    return;
                }
                div.appendChild(node);
            }
            var i0 = selectedMatchIdx,
                i1 = i0 + 1;
            if (highlightAll) {
                i0 = 0;
                i1 = matches.length;
            } else if (!isSelectedPage) {
                return;
            }
            for (var i = i0; i < i1; i++) {
                var match = matches[i];
                var begin = match.begin;
                var end = match.end;
                var isSelected = isSelectedPage && i === selectedMatchIdx;
                var highlightSuffix = isSelected ? ' selected' : '';
                if (this.findController) {
                    if (this.findController.selected.matchIdx === i && this.findController.selected.pageIdx === pageIdx) {
                        var spot = {
                            top: MATCH_SCROLL_OFFSET_TOP,
                            left: MATCH_SCROLL_OFFSET_LEFT
                        };
                        (0, _ui_utils.scrollIntoView)(textDivs[begin.divIdx], spot, true);
                    }
                }
                if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
                    if (prevEnd !== null) {
                        appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
                    }
                    beginText(begin);
                } else {
                    appendTextToDiv(prevEnd.divIdx, prevEnd.offset, begin.offset);
                }
                if (begin.divIdx === end.divIdx) {
                    appendTextToDiv(begin.divIdx, begin.offset, end.offset, 'highlight' + highlightSuffix);
                } else {
                    appendTextToDiv(begin.divIdx, begin.offset, infinity.offset, 'highlight begin' + highlightSuffix);
                    for (var n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
                        textDivs[n0].className = 'highlight middle' + highlightSuffix;
                    }
                    beginText(end, 'highlight end' + highlightSuffix);
                }
                prevEnd = end;
            }
            if (prevEnd) {
                appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
            }
        }
    }, {
        key: 'updateMatches',
        value: function updateMatches() {
            if (!this.renderingDone) {
                return;
            }
            var matches = this.matches;
            var textDivs = this.textDivs;
            var textContentItemsStr = this.textContentItemsStr;
            var clearedUntilDivIdx = -1;
            for (var i = 0, len = matches.length; i < len; i++) {
                var match = matches[i];
                var begin = Math.max(clearedUntilDivIdx, match.begin.divIdx);
                for (var n = begin, end = match.end.divIdx; n <= end; n++) {
                    var div = textDivs[n];
                    div.textContent = textContentItemsStr[n];
                    div.className = '';
                }
                clearedUntilDivIdx = match.end.divIdx + 1;
            }
            if (!this.findController || !this.findController.highlightMatches) {
                return;
            }
            var pageMatches = void 0,
                pageMatchesLength = void 0;
            if (this.findController !== null) {
                pageMatches = this.findController.pageMatches[this.pageIdx] || null;
                pageMatchesLength = this.findController.pageMatchesLength ? this.findController.pageMatchesLength[this.pageIdx] || null : null;
            }
            this.matches = this.convertMatches(pageMatches, pageMatchesLength);
            this.renderMatches(this.matches);
        }
    }, {
        key: '_bindEvents',
        value: function _bindEvents() {
            var _this2 = this;

            var eventBus = this.eventBus,
                _boundEvents = this._boundEvents;

            _boundEvents.pageCancelled = function (evt) {
                if (evt.pageNumber !== _this2.pageNumber) {
                    return;
                }
                if (_this2.textLayerRenderTask) {
                    console.error('TextLayerBuilder._bindEvents: `this.cancel()` should ' + 'have been called when the page was reset, or rendering cancelled.');
                    return;
                }
                for (var name in _boundEvents) {
                    eventBus.off(name.toLowerCase(), _boundEvents[name]);
                    delete _boundEvents[name];
                }
            };
            _boundEvents.updateTextLayerMatches = function (evt) {
                if (evt.pageIndex !== _this2.pageIdx && evt.pageIndex !== -1) {
                    return;
                }
                _this2.updateMatches();
            };
            eventBus.on('pagecancelled', _boundEvents.pageCancelled);
            eventBus.on('updatetextlayermatches', _boundEvents.updateTextLayerMatches);
        }
    }, {
        key: '_bindMouse',
        value: function _bindMouse() {
            var _this3 = this;

            var div = this.textLayerDiv;
            var expandDivsTimer = null;
            div.addEventListener('mousedown', function (evt) {
                if (_this3.enhanceTextSelection && _this3.textLayerRenderTask) {
                    _this3.textLayerRenderTask.expandTextDivs(true);
                    if (expandDivsTimer) {
                        clearTimeout(expandDivsTimer);
                        expandDivsTimer = null;
                    }
                    return;
                }
                var end = div.querySelector('.endOfContent');
                if (!end) {
                    return;
                }
                var adjustTop = evt.target !== div;
                adjustTop = adjustTop && window.getComputedStyle(end).getPropertyValue('-moz-user-select') !== 'none';
                if (adjustTop) {
                    var divBounds = div.getBoundingClientRect();
                    var r = Math.max(0, (evt.pageY - divBounds.top) / divBounds.height);
                    end.style.top = (r * 100).toFixed(2) + '%';
                }
                end.classList.add('active');
            });
            div.addEventListener('mouseup', function () {
                if (_this3.enhanceTextSelection && _this3.textLayerRenderTask) {
                    expandDivsTimer = setTimeout(function () {
                        if (_this3.textLayerRenderTask) {
                            _this3.textLayerRenderTask.expandTextDivs(false);
                        }
                        expandDivsTimer = null;
                    }, EXPAND_DIVS_TIMEOUT);
                    return;
                }
                var end = div.querySelector('.endOfContent');
                if (!end) {
                    return;
                }
                end.style.top = '';
                end.classList.remove('active');
            });
        }
    }]);

    return TextLayerBuilder;
}();

var PDFLinkService = function () {
    function PDFLinkService() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            eventBus = _ref.eventBus,
            _ref$externalLinkTarg = _ref.externalLinkTarget,
            externalLinkTarget = _ref$externalLinkTarg === undefined ? null : _ref$externalLinkTarg,
            _ref$externalLinkRel = _ref.externalLinkRel,
            externalLinkRel = _ref$externalLinkRel === undefined ? null : _ref$externalLinkRel;

        _classCallCheck(this, PDFLinkService);

        this.eventBus = eventBus || (0, _dom_events.getGlobalEventBus)();
        this.externalLinkTarget = externalLinkTarget;
        this.externalLinkRel = externalLinkRel;
        this.baseUrl = null;
        this.pdfDocument = null;
        this.pdfViewer = null;
        this.pdfHistory = null;
        this._pagesRefCache = null;
    }

    _createClass(PDFLinkService, [{
        key: 'setDocument',
        value: function setDocument(pdfDocument) {
            var baseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            this.baseUrl = baseUrl;
            this.pdfDocument = pdfDocument;
            this._pagesRefCache = Object.create(null);
        }
    }, {
        key: 'setViewer',
        value: function setViewer(pdfViewer) {
            this.pdfViewer = pdfViewer;
        }
    }, {
        key: 'setHistory',
        value: function setHistory(pdfHistory) {
            this.pdfHistory = pdfHistory;
        }
    }, {
        key: 'navigateTo',
        value: function navigateTo(dest) {
            var _this = this;

            var goToDestination = function goToDestination(_ref2) {
                var namedDest = _ref2.namedDest,
                    explicitDest = _ref2.explicitDest;

                var destRef = explicitDest[0],
                    pageNumber = void 0;
                if (destRef instanceof Object || typeof (destRef) == 'object') {
                    pageNumber = _this._cachedPageNumber(destRef);
                    if (pageNumber === null) {
                        _this.pdfDocument.getPageIndex(destRef).then(function (pageIndex) {
                            _this.cachePageRef(pageIndex + 1, destRef);
                            goToDestination({
                                namedDest: namedDest,
                                explicitDest: explicitDest
                            });
                        }).catch(function () {
                            console.error('PDFLinkService.navigateTo: "' + destRef + '" is not ' + ('a valid page reference, for dest="' + dest + '".'));
                        });
                        return;
                    }
                } else if (Number.isInteger(destRef)) {
                    pageNumber = destRef + 1;
                } else {
                    console.error('PDFLinkService.navigateTo: "' + destRef + '" is not ' + ('a valid destination reference, for dest="' + dest + '".'));
                    return;
                }
                if (!pageNumber || pageNumber < 1 || pageNumber > _this.pagesCount) {
                    console.error('PDFLinkService.navigateTo: "' + pageNumber + '" is not ' + ('a valid page number, for dest="' + dest + '".'));
                    return;
                }
                if (_this.pdfHistory) {
                    _this.pdfHistory.pushCurrentPosition();
                    _this.pdfHistory.push({
                        namedDest: namedDest,
                        explicitDest: explicitDest,
                        pageNumber: pageNumber
                    });
                }
                _this.pdfViewer.scrollPageIntoView({
                    pageNumber: pageNumber,
                    destArray: explicitDest
                });
            };
            new Promise(function (resolve, reject) {
                if (typeof dest === 'string') {
                    _this.pdfDocument.getDestination(dest).then(function (destArray) {
                        resolve({
                            namedDest: dest,
                            explicitDest: destArray
                        });
                    });
                    return;
                }
                resolve({
                    namedDest: '',
                    explicitDest: dest
                });
            }).then(function (data) {
                if (!Array.isArray(data.explicitDest)) {
                    console.error('PDFLinkService.navigateTo: "' + data.explicitDest + '" is' + (' not a valid destination array, for dest="' + dest + '".'));
                    return;
                }
                goToDestination(data);
            });
        }
    },

    {
        key: 'goToDestination',
        value: function navigateTo(dest) {
            var _this = this;

            var goToDestination = function goToDestination(_ref2) {
                var namedDest = _ref2.namedDest,
                    explicitDest = _ref2.explicitDest;

                var destRef = explicitDest[0],
                    pageNumber = void 0;
                if (destRef instanceof Object || typeof (destRef) == 'object') {
                    pageNumber = _this._cachedPageNumber(destRef);
                    if (pageNumber === null) {
                        _this.pdfDocument.getPageIndex(destRef).then(function (pageIndex) {
                            _this.cachePageRef(pageIndex + 1, destRef);
                            goToDestination({
                                namedDest: namedDest,
                                explicitDest: explicitDest
                            });
                        }).catch(function () {
                            console.error('PDFLinkService.navigateTo: "' + destRef + '" is not ' + ('a valid page reference, for dest="' + dest + '".'));
                        });
                        return;
                    }
                } else if (Number.isInteger(destRef)) {
                    pageNumber = destRef + 1;
                } else {
                    console.error('PDFLinkService.navigateTo: "' + destRef + '" is not ' + ('a valid destination reference, for dest="' + dest + '".'));
                    return;
                }
                if (!pageNumber || pageNumber < 1 || pageNumber > _this.pagesCount) {
                    console.error('PDFLinkService.navigateTo: "' + pageNumber + '" is not ' + ('a valid page number, for dest="' + dest + '".'));
                    return;
                }
                if (_this.pdfHistory) {
                    _this.pdfHistory.pushCurrentPosition();
                    _this.pdfHistory.push({
                        namedDest: namedDest,
                        explicitDest: explicitDest,
                        pageNumber: pageNumber
                    });
                }
                _this.pdfViewer.scrollPageIntoView({
                    pageNumber: pageNumber,
                    destArray: explicitDest
                });
            };
            new Promise(function (resolve, reject) {
                if (typeof dest === 'string') {
                    _this.pdfDocument.getDestination(dest).then(function (destArray) {
                        resolve({
                            namedDest: dest,
                            explicitDest: destArray
                        });
                    });
                    return;
                }
                resolve({
                    namedDest: '',
                    explicitDest: dest
                });
            }).then(function (data) {
                if (!Array.isArray(data.explicitDest)) {
                    console.error('PDFLinkService.navigateTo: "' + data.explicitDest + '" is' + (' not a valid destination array, for dest="' + dest + '".'));
                    return;
                }
                goToDestination(data);
            });
        }
    },




    {
        key: 'getDestinationHash',
        value: function getDestinationHash(dest) {
            if (typeof dest === 'string') {
                return this.getAnchorUrl('#' + escape(dest));
            }
            if (Array.isArray(dest)) {
                var str = JSON.stringify(dest);
                return this.getAnchorUrl('#' + escape(str));
            }
            return this.getAnchorUrl('');
        }
    }, {
        key: 'getAnchorUrl',
        value: function getAnchorUrl(anchor) {
            return (this.baseUrl || '') + anchor;
        }
    }, {
        key: 'setHash',
        value: function setHash(hash) {
            var pageNumber = void 0,
                dest = void 0;
            if (hash.includes('=')) {
                var params = (0, _ui_utils.parseQueryString)(hash);
                if ('search' in params) {
                    this.eventBus.dispatch('findfromurlhash', {
                        source: this,
                        query: params['search'].replace(/"/g, ''),
                        phraseSearch: params['phrase'] === 'true'
                    });
                }
                if ('nameddest' in params) {
                    this.navigateTo(params.nameddest);
                    return;
                }
                if ('page' in params) {
                    pageNumber = params.page | 0 || 1;
                }
                if ('zoom' in params) {
                    var zoomArgs = params.zoom.split(',');
                    var zoomArg = zoomArgs[0];
                    var zoomArgNumber = parseFloat(zoomArg);
                    if (!zoomArg.includes('Fit')) {
                        dest = [null, { name: 'XYZ' }, zoomArgs.length > 1 ? zoomArgs[1] | 0 : null, zoomArgs.length > 2 ? zoomArgs[2] | 0 : null, zoomArgNumber ? zoomArgNumber / 100 : zoomArg];
                    } else {
                        if (zoomArg === 'Fit' || zoomArg === 'FitB') {
                            dest = [null, { name: zoomArg }];
                        } else if (zoomArg === 'FitH' || zoomArg === 'FitBH' || zoomArg === 'FitV' || zoomArg === 'FitBV') {
                            dest = [null, { name: zoomArg }, zoomArgs.length > 1 ? zoomArgs[1] | 0 : null];
                        } else if (zoomArg === 'FitR') {
                            if (zoomArgs.length !== 5) {
                                console.error('PDFLinkService.setHash: Not enough parameters for "FitR".');
                            } else {
                                dest = [null, { name: zoomArg }, zoomArgs[1] | 0, zoomArgs[2] | 0, zoomArgs[3] | 0, zoomArgs[4] | 0];
                            }
                        } else {
                            console.error('PDFLinkService.setHash: "' + zoomArg + '" is not ' + 'a valid zoom value.');
                        }
                    }
                }
                if (dest) {
                    this.pdfViewer.scrollPageIntoView({
                        pageNumber: pageNumber || this.page,
                        destArray: dest,
                        allowNegativeOffset: true
                    });
                } else if (pageNumber) {
                    this.page = pageNumber;
                }
                if ('pagemode' in params) {
                    this.eventBus.dispatch('pagemode', {
                        source: this,
                        mode: params.pagemode
                    });
                }
            } else {
                dest = unescape(hash);
                try {
                    dest = JSON.parse(dest);
                    if (!Array.isArray(dest)) {
                        dest = dest.toString();
                    }
                } catch (ex) { }
                if (typeof dest === 'string' || isValidExplicitDestination(dest)) {
                    this.navigateTo(dest);
                    return;
                }
                console.error('PDFLinkService.setHash: "' + unescape(hash) + '" is not ' + 'a valid destination.');
            }
        }
    }, {
        key: 'executeNamedAction',
        value: function executeNamedAction(action) {
            switch (action) {
                case 'GoBack':
                    if (this.pdfHistory) {
                        this.pdfHistory.back();
                    }
                    break;
                case 'GoForward':
                    if (this.pdfHistory) {
                        this.pdfHistory.forward();
                    }
                    break;
                case 'NextPage':
                    if (this.page < this.pagesCount) {
                        this.page++;
                    }
                    break;
                case 'PrevPage':
                    if (this.page > 1) {
                        this.page--;
                    }
                    break;
                case 'LastPage':
                    this.page = this.pagesCount;
                    break;
                case 'FirstPage':
                    this.page = 1;
                    break;
                default:
                    break;
            }
            this.eventBus.dispatch('namedaction', {
                source: this,
                action: action
            });
        }
    }, {
        key: 'cachePageRef',
        value: function cachePageRef(pageNum, pageRef) {
            if (!pageRef) {
                return;
            }
            var refStr = pageRef.num + ' ' + pageRef.gen + ' R';
            this._pagesRefCache[refStr] = pageNum;
        }
    }, {
        key: '_cachedPageNumber',
        value: function _cachedPageNumber(pageRef) {
            var refStr = pageRef.num + ' ' + pageRef.gen + ' R';
            return this._pagesRefCache && this._pagesRefCache[refStr] || null;
        }
    }, {
        key: 'pagesCount',
        get: function get() {
            return this.pdfDocument ? this.pdfDocument.numPages : 0;
        }
    }, {
        key: 'page',
        get: function get() {
            return this.pdfViewer.currentPageNumber;
        },
        set: function set(value) {
            this.pdfViewer.currentPageNumber = value;
        }
    }, {
        key: 'rotation',
        get: function get() {
            return this.pdfViewer.pagesRotation;
        },
        set: function set(value) {
            this.pdfViewer.pagesRotation = value;
        }
    }]);

    return PDFLinkService;
}();

function isValidExplicitDestination(dest) {
    if (!Array.isArray(dest)) {
        return false;
    }
    var destLength = dest.length,
        allowNull = true;
    if (destLength < 2) {
        return false;
    }
    var page = dest[0];
    if (!((typeof page === 'undefined' ? 'undefined' : _typeof(page)) === 'object' && Number.isInteger(page.num) && Number.isInteger(page.gen)) && !(Number.isInteger(page) && page >= 0)) {
        return false;
    }
    var zoom = dest[1];
    if (!((typeof zoom === 'undefined' ? 'undefined' : _typeof(zoom)) === 'object' && typeof zoom.name === 'string')) {
        return false;
    }
    switch (zoom.name) {
        case 'XYZ':
            if (destLength !== 5) {
                return false;
            }
            break;
        case 'Fit':
        case 'FitB':
            return destLength === 2;
        case 'FitH':
        case 'FitBH':
        case 'FitV':
        case 'FitBV':
            if (destLength !== 3) {
                return false;
            }
            break;
        case 'FitR':
            if (destLength !== 6) {
                return false;
            }
            allowNull = false;
            break;
        default:
            return false;
    }
    for (var i = 2; i < destLength; i++) {
        var param = dest[i];
        if (!(typeof param === 'number' || allowNull && param === null)) {
            return false;
        }
    }
    return true;
}

