/**
 * Created by olegrovenskyi on 26.05.16.
 */

var productService = (function () {
    var errorMap = {
        qty: {
            msg: 'Please set correct product QTY'
        },
        maxVal: function (val) {
            return {
                msg: 'Sorry, the maximum quantity you can order is ' + val
            }
        }
    };

    function _getProducts (url) {
        return $.get(url)
            .done(_successGetProducts)
            .fail(_failGetProducts)
    }

    function _sumTotalPrice (qty, price) {
        return qty * price;
    }

    function _validate (value) {
        var totalProduct = value.totalProduct.stock + value.totalProduct.sklad;

        if (value.pQuantity === 0) {
            return value.error = errorMap.qty;
        } else if (value.pQuantity > 99) {
            return value.error = errorMap.maxVal(99);
        } else if (value.pQuantity > totalProduct) {
            return value.error = errorMap.maxVal(totalProduct);
        } else if (value.isInStoreOnly && value.pQuantity > value.totalProduct.stock) {
            return value.error = errorMap.maxVal(value.totalProduct.stock);
        }

        return value;
    }

    function _successGetProducts (data) {
        // в данной фугкции можно модифицировать полученный от сервера обьект с данными, если нужно
        var products = data.products;

        $.each(products, function(key, value) {
            _validate(value);

            value.totalPrice = _sumTotalPrice(value.pQuantity, value.pPrice);
        });
    }

    function _failGetProducts (error) {
        // если нужно можем расширить обьект с ошибкой
        console.log('*** _failGetProducts ***', error)
    }

    function loadData (api) {
        return _getProducts(api);
    }

    return {
        loadData: loadData
    }
}());