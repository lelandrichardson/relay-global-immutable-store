
// Example Usage:
// --------------

//var FooContainer = Container(Foo, props => ({
//    results: Api.getFoo(props.id)
//}));

module.exports = function Container(Component, getState) {

    return React.createClass({

        statics: {
            Component
        },

        getInitialState() {
            return this.buildState(this.props);
        },

        buildState(props) {
            var promises = getState(props);
            var state = {};
            for (var prop in promises) {
                if (promises[prop] instanceof Promise) {
                    promises[prop].then(this.resolvePromiseFor(prop))
                } else {
                    state[prop] = promises[prop];
                }
            }
            return state;
        },

        resolvePromiseFor(prop) {
            return data => {
                if (this.isMounted()) {
                    this.setState(state => state[prop] = data);
                }
            };
        },

        componentWillReceiveProps(nextProps) {
            if (!shallowEqual(nextProps, this.props)) {
                this.setState(this.buildState(nextProps));
            }
        },

        render() {
            return <Component {...this.props} {...this.state} />;
        }
    });
};