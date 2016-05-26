/**
 * Created by olegrovenskyi on 26.05.16.
 */

// Модуль для работы с продуктами

var cartModule = (function (productWrap, productTplId, errorTplId) {
    var productData = {},
        loadData = {},
        $el = $('.' + productWrap),
        productsUrl = '/api/products',
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
            product: _.template($('#' + productTplId).html()),
            error: _.template($('#' + errorTplId).html())
        };

    function init () {
        productService.loadData(productsUrl)
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
        var $products = $('#products');

        $products.on('click', '.update', _updateQty);
        $products.on('click', '.remove', _removeProduct);
        $('#buy').on('click', _buyProducts);
    }

    function _render (data) {
        var products = data.products,
            domEl = '';

        $.each(products, function(key, value) {
            if (value.error) {
                var productEl = templates.product(value),
                    prod = $(productEl)
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
        var parent = $(this).closest('.info'),
            skuId = parent.attr('sku'),
            qty = parseInt(parent.find('.qty').val(), 10);

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
        var product = _getProduct(skuId),
            totalProduct = product.totalProduct.stock + product.totalProduct.sklad;

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
        var product = _getProduct(skuId),
            $skuEl = $('[sku=' + skuId + ']'),
            totalPrice = qty * product.pPrice;

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
        var parent = $(this).closest('.info'),
            skuId = parent.attr('sku');

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
        productService.loadData(productsUrl)
            .done(_successLoadData)
            .fail(_fail);
    }

    function _successLoadData (data) {
        loadData = data;

        var products = productData.products,
            productsOnStore = [],
            isValid = true;

        $.each(products, function(key, value) {
            var skuId = value.pSku,
                product = value;

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
}('wrap-product', 'product-section', 'error'));