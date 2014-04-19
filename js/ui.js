(function (mc) {
    var extend = function (base, ex) {
        for (var key in ex) {
            if (ex.hasOwnProperty(key)) {
                base[key] = ex[key];
            }
        }
    };

    function element(properties) {
        var e = document.createElement(properties.tag);
        if (properties.class) {
            e.setAttribute('class', 'mc-' + properties.class);
        }
        if (properties.style) {
            Object.keys(properties.style).forEach(function (key) {
                e.style[key] = properties.style[key];
            });
        }
        if (properties.events) {
            Object.keys(properties.events).forEach(function (key) {
                e[key] = properties.event[key];
            });
        }
        if (properties.children) {
            properties.children.forEach(function (child) {
                var c;
                if (typeof child === 'object') {
                    c = element(child);
                } else {
                    c = document.createTextNode(String(child));
                }
                e.appendChild(c);
            });
        }
        return e;
    }

    mc.UI = function () {
        this.hud = mc.UI.Container({
            children: [
                
            ]
        });
    };
    mc.UI.Button = function (props) {
        props = props || {};
        props.tag = 'div';
        props.class = 'button';
        return element(props);
    };

    mc.UI.Container = function (props) {
        props = props || {};
        props.tag = 'div';
        props.class = 'container';
        return element(props);
    };
}) (mc);