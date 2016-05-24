var productService = (function () {
    var errorMap = {
        qty: {
            msg: 'Please set product QTY'
        }
    };

    function _getProducts (url) {
        return $.get(url)
            .done(_success)
            .fail(_fail)
    }

    function _totalPrice (qty, price) {
        return qty * price;
    }

    function _validateProducts (data) {
        var products = data.products;

        $.each(products, function(key, value) {
            if (value.pQuantity === 0) {
                value.error = errorMap.qty
            }

            value.totalPrice = _totalPrice(value.pQuantity, value.pPrice);
        });
    }

    function _success (data) {
        _validateProducts(data);
    }

    function _fail (error) {
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
        $el = $('.wrap-product');
        errorMap = {
            qty: {
                msg: 'Please set correct product QTY'
            },
            maxVal: {
                msg: 'Sorry, the maximum quantity you can order is 99'
            }
        },
        templates = {
            product: _.template($('#product').html()),
            error: _.template($('#error').html())
        };

    function _render (data) {
        var products = data.products;
        var domEl = '';

        $.each(products, function(key, value) {
            if (value.error) {
                var productEl = templates.product(value);
                var prod = $(productEl).prepend(templates.error(value.error));

                domEl += prod[0].outerHTML;
            } else {
                domEl += templates.product(value);
            }
        });

        $el.append(domEl)
    }

    function _success (data) {
        productData = data;

        _render(data);
    }

    function _fail (error) {
        var errorMsg = {
            msg: error.responseText
        };

        $('.container').append(templates.error(errorMsg));
    }

    function _renderErrorMsg (el, msg) {
        _resetError(el);

        el.prepend(templates.error(msg));
        el.find('.qty').addClass('error-msg');
    }

    function _resetError (el) {
        el.find('.error').remove();
        el.find('.qty').removeClass('error-msg')
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

    function _updateTotalPrice (el, qty, price) {
        var totalPrice = qty * price;

        el.find('.total-price').text(totalPrice);
    }

    function _updateQty () {
        var parent = $(this).closest('.info');
        var index = $(this).closest('.info').index();
        var qty = parseInt(parent.find('.qty').val(), 10);

        if(_validateQty(qty, parent, index)) {
            // send request to save qty
            _updateTotalPrice(parent, qty, productData.products[index].pPrice);

            _resetError(parent);
            console.log('qty updated');
        }
    }

    function _addEventListeners () {
        $(document).on('click', '.update', _updateQty);
    }
    
    function init () {
        var api = '/api/products';

        productService.loadData(api)
            .done(_success)
            .fail(_fail);

        _addEventListeners();
    }
    
    return {
        init: init
    }
}());

cartModule.init();