// Сервис который отвечает за получение данных по продуктам и базовой их валидации

var productService = (function () {
    var errorMap = {
        qty: {
            msg: 'Please set product QTY'
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

    function _validateProducts (data) {
        var products = data.products;

        $.each(products, function(key, value) {
            if (value.pQuantity === 0) {
                value.error = errorMap.qty
            }

            value.totalPrice = _sumTotalPrice(value.pQuantity, value.pPrice);
        });
    }

    function _successGetProducts (data) {
        _validateProducts(data);
    }

    function _failGetProducts (error) {
        console.log(error)
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
            maxVal: {
                msg: 'Sorry, the maximum quantity you can order is 99'
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

        _addEventListeners();
    }

    function _fail (error) {
        var errorMsg = {
            msg: error.responseText
        };

        $('.container').append(templates.error(errorMsg));
    }

    function _addEventListeners () {
        $('#products').on('click', '.update', _updateQty);
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
        var index = $(this).closest('.info').index();
        var qty = parseInt(parent.find('.qty').val(), 10);

        if(_validateQty(qty, parent, index)) {
            // send request to save qty
            _updateTotalPrice(parent, qty, productData.products[index].pPrice);

            _removeErrorMsg(parent);
            console.log('qty updated');
        }
    }

    function _updateTotalPrice (el, qty, price) {
        var totalPrice = qty * price;

        el.find('.total-price').text(totalPrice);
    }

    function _validateQty (qty, parent, index) {
        var totalProduct = productData.products[index].totalProduct.stock + productData.products[index].totalProduct.sklad;

        if (qty === 0) {
            _renderErrorMsg(parent, errorMap.qty);

            return false;
        }

        if (qty >= totalProduct) {
            _renderErrorMsg(parent, errorMap.maxVal);

            return false;
        }

        return true;
    }

    function _renderErrorMsg (el, msg) {
        _removeErrorMsg(el);

        el.prepend(templates.error(msg));
        el.find('.qty').addClass('error-msg');
    }

    function _removeErrorMsg (el) {
        el.find('.error').remove();
        el.find('.qty').removeClass('error-msg')
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
            var pSku = value.pSku;
            var pQuantity = value.pQuantity;

            productsOnStore = $.grep(loadData.products, function(value, index) {
                if (pSku === value.pSku) {
                    if (_validateByProduct(pQuantity, value)) {
                        return value.pSku == pSku;
                    } else {
                        isValid = false;
                        return value.error = errorMap.maxVal;
                    }
                } else {
                    return {
                        error: 'error'
                    }
                }
            });
        });

        if (isValid) {
            // send request to buy products
            console.log('buy products')
        } else {
            console.log('we have error')
        }

        console.log(productsOnStore);

    }

    function _validateByProduct (qty, data) {
            var totalProduct = data.totalProduct.stock + data.totalProduct.sklad;
            var pQuantity = qty;

            if (pQuantity >= totalProduct || pQuantity === 0) {
                // call method show error

                return false;
            }

            return true;
    }

    return {
        init: init
    }
}());

cartModule.init();