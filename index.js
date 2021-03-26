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
            let value = quote[metricGroups[0]][metricGroups[1]];
            return (value === undefined ? "" : "" + value);
        }
    }
    return quote;
}

app.get('/:ticker', cache(20), (req, res) => {
    let ticker = req.params.ticker;
    let metric = req.query.metric;

    let request = buildRequest(ticker, metric);

    let baseMetricKey = '__express__' +  JSON.stringify(request);
    let cachedQuote = mcache.get(baseMetricKey);

    if (cachedQuote) {
        return res.status(200).send(parseResponse(cachedQuote, metric));
    }

    return yahooFinance.quote(request)
        .then((quote) => {
            mcache.put(baseMetricKey, quote, 60 * 1000); // cache response from yahoo for 1 minute
            return res.status(200).send(parseResponse(quote, metric));
        }).catch(function (err) {
            // never goes here
            console.log(err);
            return res.status(500).json(err);
        });
});

async function test() {
    let ticker = 'aapl';
    let metric = 'summaryDetail.dividendRate';
    console.log(buildRequest(ticker, metric));

     await yahooFinance.quote(buildRequest(ticker, metric)).
         then((resp) => {
        console.log(parseResponse(resp, metric));
     });
}

test();

app.listen(port, () => {
    console.log(`Stockopedia app listening on port ${port}!`)
});
