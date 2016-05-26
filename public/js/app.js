// Сервис который отвечает за получение данных по продуктам и базовой их валидации

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

var cartModule = (function () {
    var productData = {},
        loadData = {},
        $el = $('.wrap-product'),
        api = '/api/products',
        errorMap = {
            qty: {
                msg: 'Please set correct product QTY'
            },
            maxVal: function (val) {
                return {
                    msg: 'Sorry, the maximum quantity you can order is ' + val
                }
            }
        },
        templates = {
            product: _.template($('#product-section').html()),
            error: _.template($('#error').html())
        };

    function init () {
        productService.loadData(api)
            .done(_success)
            .fail(_fail);
    }

    function _success (data) {
        productData = data;

        _render(data);

        _addListeners();
    }

    function _fail (error) {
        var errorMsg = {
            msg: error.responseText
        };

        $('.container').append(templates.error(errorMsg));
    }

    function _addListeners () {
        $('#products').on('click', '.update', _updateQty);
        $('#products').on('click', '.remove', _removeProduct);
        $('#buy').on('click', _buyProducts);
    }

    function _render (data) {
        var products = data.products;
        var domEl = '';

        $.each(products, function(key, value) {
            if (value.error) {
                var productEl = templates.product(value);
                var prod = $(productEl)
                    .find('.qty')
                    .addClass('error-msg')
                    .end()
                    .prepend(templates.error(value.error));

                domEl += prod[0].outerHTML;
            } else {
                domEl += templates.product(value);
            }
        });

        $el.append(domEl)
    }

    function _updateQty () {
        var parent = $(this).closest('.info');
        var skuId = parent.attr('sku');
        var qty = parseInt(parent.find('.qty').val(), 10);

        if(_validateQty(qty, skuId)) {
            _hideErrorMsg(parent);

            _updateTotalPrice(qty, skuId);

            // обновление продукта актуальным значение qty
            productData.products = productData.products
                .filter(function (el) {
                        if (el.pSku === skuId) {
                            el.pQuantity = qty;
                        }

                        return true;
                    }
                );

            // нужно отправить запрос на сервер для сохраниение qty
            console.log('*** _updateQty ***', 'qty updated: ' + qty);
        }
    }

    function _getProduct (skuId) {
        var product = $.grep(productData.products, function(value, index) {
            return value.pSku === skuId;
        });

        return product[0];
    }

    function _validateQty (qty, skuId) {
        var product = _getProduct(skuId);
        var totalProduct = product.totalProduct.stock + product.totalProduct.sklad;

        if (qty === 0) {
            _showErrorMsg(skuId, errorMap.qty);

            return false;
        } else if (qty > 99) {
            _showErrorMsg(skuId, errorMap.maxVal(99));

            return false;
        } else if (qty > totalProduct) {
            _showErrorMsg(skuId, errorMap.maxVal(totalProduct));

            return false;
        } else if (product.isInStoreOnly && qty > product.totalProduct.stock) {
            _showErrorMsg(skuId, errorMap.maxVal(product.totalProduct.stock));

            return false;
        }

        return true;
    }

    function _updateTotalPrice (qty, skuId) {
        var product = _getProduct(skuId);
        var $skuEl = $('[sku=' + skuId + ']');
        var totalPrice = qty * product.pPrice;

        $skuEl.find('.total-price').text(totalPrice);
    }

    function _showErrorMsg (sku, msg) {
        var $skuEl = $('[sku=' + sku + ']');
        _hideErrorMsg($skuEl);

        $skuEl.prepend(templates.error(msg));
        $skuEl.find('.qty').addClass('error-msg');
    }

    function _hideErrorMsg (el) {
        el.find('.error').remove();
        el.find('.qty').removeClass('error-msg')
    }

    function _removeProduct () {
        var parent = $(this).closest('.info');
        var skuId = parent.attr('sku');

        // обновляем список продуктов
        productData.products = productData.products
            .filter(function (el) {
                    return el.pSku !== skuId;
                }
            );

        parent.remove();
        // нужно отправить запрос к серверу на удаление продукта передав в параметрах skuId
    }

    function _buyProducts() {
        productService.loadData(api)
            .done(_successLoadData)
            .fail(_fail);
    }

    function _successLoadData (data) {
        loadData = data;

        var products = productData.products;
        var productsOnStore = [];
        var isValid = true;

        $.each(products, function(key, value) {
            var skuId = value.pSku;
            var product = value;

            productsOnStore = $.grep(loadData.products, function(value, index) {
                if (skuId === value.pSku) {
                    if (!_validateQty(product.pQuantity, skuId)) {
                        isValid = false;
                    }
                }
            });
        });

        if (isValid) {
            alert('Success!!!');

            // нужео отправить запрос на сервер на покупку продуктов
        }
    }

    return {
        init: init
    }
}());

cartModule.init();