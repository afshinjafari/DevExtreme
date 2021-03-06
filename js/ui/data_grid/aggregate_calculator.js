"use strict";

var Class = require("../../core/class"),
    compileGetter = require("../../core/utils/data").compileGetter,
    isFunction = require("../../core/utils/type").isFunction,
    errors = require("../../data/errors").errors,
    dataUtils = require("../../data/utils");

function depthFirstSearch(i, depth, root, callback) {
    var j = 0;
    if(i < depth) {
        for(; j < root.items.length; j++) {
            depthFirstSearch(i + 1, depth, root.items[j], callback);
        }
    }

    if(i === depth) {
        callback(root);
    }
}

// NOTE: https://github.com/jquery/jquery/blame/master/src/core.js#L392
function map(array, callback) {
    var i, result;

    if("map" in array) {
        return array.map(callback);
    }

    result = new Array(array.length);
    for(i in array) {
        result[i] = callback(array[i], i);
    }

    return result;
}

function isEmpty(x) {
    return (x !== x) || (x === "") || (x === null) || (x === undefined);
}

function isCount(aggregator) {
    return aggregator === dataUtils.aggregators.count;
}

function normalizeAggregate(aggregate) {
    var selector = compileGetter(aggregate.selector),
        skipEmptyValues = ("skipEmptyValues" in aggregate)
            ? aggregate.skipEmptyValues
            : true,
        aggregator = aggregate.aggregator;


    if(typeof aggregator === "string") {
        aggregator = dataUtils.aggregators[aggregator];
        if(!aggregator) {
            throw errors.Error("E4001", aggregate.aggregator);
        }
    }

    return {
        selector: selector,
        aggregator: aggregator,
        skipEmptyValues: skipEmptyValues
    };
}

module.exports = Class.inherit({
    ctor: function(options) {
        this._data = options.data;
        this._groupLevel = options.groupLevel || 0;
        this._totalAggregates = map(options.totalAggregates || [], normalizeAggregate);
        this._groupAggregates = map(options.groupAggregates || [], normalizeAggregate);
        this._totals = [];
    },

    calculate: function() {
        if(this._totalAggregates.length) {
            this._calculateTotals(0, { items: this._data });
        }

        if(this._groupAggregates.length && this._groupLevel > 0) {
            this._calculateGroups({ items: this._data });
        }
    },

    totalAggregates: function() {
        return this._totals;
    },

    _aggregate: function(aggregates, data, container) {
        var i, j;

        for(i = 0; i < aggregates.length; i++) {
            if(isCount(aggregates[i].aggregator)) {
                container[i] = (container[i] || 0) + data.items.length;
                continue;
            }

            for(j = 0; j < data.items.length; j++) {
                this._accumulate(i, aggregates[i], container, data.items[j]);
            }
        }
    },

    _calculateTotals: function(level, data) {
        var i;
        if(level === 0) {
            this._totals = this._seed(this._totalAggregates);
        }

        if(level === this._groupLevel) {
            this._aggregate(this._totalAggregates, data, this._totals);
        } else {
            for(i = 0; i < data.items.length; i++) {
                this._calculateTotals(level + 1, data.items[i]);
            }
        }

        if(level === 0) {
            this._totals = this._finalize(this._totalAggregates, this._totals);
        }
    },

    _calculateGroups: function(root) {
        var maxLevel = this._groupLevel,
            currentLevel = maxLevel + 1,

            seedFn = this._seed.bind(this, this._groupAggregates),
            stepFn = this._aggregate.bind(this, this._groupAggregates),
            finalizeFn = this._finalize.bind(this, this._groupAggregates);

        function aggregator(node) {
            node.aggregates = seedFn();

            if(currentLevel === maxLevel) {
                stepFn(node, node.aggregates);
            } else {
                depthFirstSearch(currentLevel, maxLevel, node, function(innerNode) {
                    stepFn(innerNode, node.aggregates);
                });
            }

            node.aggregates = finalizeFn(node.aggregates);
        }

        while(--currentLevel > 0) {
            depthFirstSearch(0, currentLevel, root, aggregator);
        }
    },

    _seed: function(aggregates) {
        return map(aggregates, function(aggregate) {
            var aggregator = aggregate.aggregator,
                seed = "seed" in aggregator
                    ? (isFunction(aggregator.seed) ? aggregator.seed() : aggregator.seed)
                    : NaN;

            return seed;
        });
    },

    _accumulate: function(aggregateIndex, aggregate, results, item) {
        var value = aggregate.selector(item),
            aggregator = aggregate.aggregator,
            skipEmptyValues = aggregate.skipEmptyValues;

        if(skipEmptyValues && isEmpty(value)) {
            return;
        }

        if(results[aggregateIndex] !== results[aggregateIndex]) {
            results[aggregateIndex] = value;
        } else {
            results[aggregateIndex] = aggregator.step(results[aggregateIndex], value);
        }
    },

    _finalize: function(aggregates, results) {
        return map(aggregates, function(aggregate, index) {
            var fin = aggregate.aggregator.finalize;
            return fin
                ? fin(results[index])
                : results[index];
        });
    }
});
