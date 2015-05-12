var React = require('react');
var Store = require('./Store');
var shallowEqual = require('react-pure-render/shallowEqual');

function createContainer (Component, spec) {
    var Store = this;

    return React.createClass({

        mixins: [spec],

        getInitialState() {
            return {
                $state: spec.getInitialState ? spec.getInitialState() : null
            };
        },

        handleDataChange() {
            if (!this.isMounted()) {
                return;
            }
            this.setData();
        },

        setData() {
            var $data = spec.getData(this.props, this.state);
            var $loaded = true;
            for (var prop in $data) {
                if ($data[prop] === null) {
                    $loaded = false;
                }
            }
            this.setState({ $data, $loaded });
        },


        componentWillMount() {
            this.setData()
        },

        componentDidMount() {
            Store.subscribe(this.handleDataChange);
        },

        componentWillUnmount() {
            Store.unsubscribe(this.handleDataChange);
        },

        componentWillReceiveProps(newProps) {

        },

        setContainerState(state) {
            this.setState({
                $state: Object.assign(this.state.$state, state)
            });
        },

        render() {
            if (!this.state.$loaded) {
                if (this.renderLoading) {
                    return this.renderLoading();
                } else {
                    return null; // don't render anything...
                }
            }

            return (
                <Component {...this.props} {...this.state.$state} {...this.state.$data} setContainerState={this.setContainerState} />
            );
        }
    });
}

// Desired API:
// ============

var SearchContainer = Store.createContainer(Search, {
    getInitialState() {
        return {
            page: 1,
            perPage: 20
        };
    },
    getData(props, state) {
        var filter = { query: props.query, sort: props.sort};
        return {
            results: Store.globalSearch.getItems(filter, state.page, state.perPage),
            total: Store.globalSearch.getTotal(filter)
        };
    }
});

var ProfileContainer = Store.createContainer(Profile, {
    getData(props, state){
        return {
            member: Store.member.get({ id: props.id })
        };
    },
    renderLoading() {
        return (
            <div>
                <div>Loading...</div>

            </div>
        );
    }
});
