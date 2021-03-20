var yahooFinance = require('yahoo-finance');
const express = require('express');
var mcache = require('memory-cache');

const port = process.env.PORT || 9000
const app = express();

var cache = (duration) => {
    return (req, res, next) => {
        let key = '__express__' + req.originalUrl || req.url;
        let cachedBody = mcache.get(key);
        if (cachedBody && req.query.fetch === undefined) {
            res.send(cachedBody);
            return;
        } else {
            res.sendResponse = res.send;
            res.send = (body) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body);
            }
            next();
        }
    }
}


function buildRequest(ticker, metric) {
     var modules = ['recommendationTrend', 'summaryDetail', 'earnings', 'calendarEvents', 'upgradeDowngradeHistory', 'price', 'defaultKeyStatistics', 'summaryProfile', 'financialData'];

    if (metric) {
        let metricGroups = metric.split('.');
        modules = [metricGroups[0]];
    }

    return {
        symbol: ticker.toUpperCase(),
        modules: modules
    }
}

function parseResponse(quote, metric) {
    if (metric) {
        let metricGroups = metric.split('.');
        if (metricGroups.length == 2) {
            return "" + quote[metricGroups[0]][metricGroups[1]];
        }
    }
    return quote;
}

app.get('/:ticker', cache(20), (req, res) => {
    let ticker = req.params.ticker;
    let metric = req.query.metric;

    return yahooFinance.quote(buildRequest(ticker, metric))
        .then((quote) => {
            return res.status(500).send(parseResponse(quote, metric));
        }).catch(function (err) {
            // never goes here
            console.log(err);
            return res.status(500).json(err);
        });
});

function test() {
    let ticker = 'APPL';
    let metric = 'summaryDetail';
    console.log(buildRequest(ticker, metric));

    yahooFinance.quote(buildRequest(ticker, metric))
        .then(function (quotes) {
            if (quotes[0]) {
                console.log(
                    '%s\n...\n%s',
                    JSON.stringify(quotes[0], null, 2),
                    JSON.stringify(quotes[quotes.length - 1], null, 2)
                );
            } else {
                console.log('N/A');
            }
        });
}

//test();

app.listen(port, () => {
    console.log(`Stockopedia app listening on port ${port}!`)
});
