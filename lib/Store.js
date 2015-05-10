var {
    Map,
    List,
    fromJS
} = require('immutable');

class GlobalStore {

    constructor(spec) {
        this.dirty = false;
        this.lastSync = null;
        this.state = Map();
        this.stores = {};
        this.queue = [];

        for (var typeName in spec.types) {
            var typedef = spec.types[typeName];

            this.set(typeName, Map());
            this.stores[typeName] = ContentStore(this, typeName, spec.types[typeName]);

            for (var prop in typedef) {
                var rel = typedef[prop];

                if (Array.isArray(rel.type)) {
                    // one:many relationship
                    var storePath = `${typeName}::${prop}`;
                    this.set(storePath, Map());
                    this.stores[storePath] = IndexedListStore(this, storePath, typeName);
                }
            }
        }
    }

    set(prop, value) {
        this.state = this.state.set(prop, value);
        this.dirty = true;
    }

    setIn(path, value) {
        this.state = this.state.setIn(path, value);
        this.dirty = true;
    }

    update(a,b,c) {
        this.state = this.state.update(a, b, c);
        this.dirty = true;
    }

    updateIn(a, b, c) {
        this.state = this.state.updateIn(a, b, c);
        this.dirty = true;
    }

    merge(obj) {
        this.state = this.state.merge(obj);
        this.dirty = true;
    }

    mergeIn(path, obj) {
        this.state = this.state.mergeIn(path, obj);
        this.dirty = true;
    }

    get(prop) {
        return this.state.get(prop);
    }

    getIn(path) {
        return this.state.getIn(path);
    }

    has(prop) {
        return this.state.has(prop);
    }

    hasIn(path) {
        return this.state.hasIn(path);
    }




    processResponse(response) {

        for (var type of response.data) {
            var rows = response.data[type];
            rows.forEach(item => this.stores[type].set(item.id, item));
        }

        // we've updated ourselves with the server up to this point in time
        this.lastSync = response.asOf;
    }

    flush() {
        // this is run every N ms to batch the request queue up to the server
    }

    localAction() {
        // push into queue
        // update store optimistically
    }
}

function makeGetter(store, path, prop) {
    return function getter() {
        return store.stores[path].get(this[prop]);
    };
}

class ContentStore {
    constructor(store, type, typedef) {
        this.store = store;
        this.type = type;
        this.typedef = typedef;
        this.mixin = {};

        for (let prop in typedef) {
            let rel = typedef[prop];

            if (Array.isArray(rel.type)) {
                // one:many relationship
                this.mixin[prop] = makeGetter(store, `${type}::${prop}`, rel.key);
            } else {
                // one:one relationship
                this.mixin[prop] = makeGetter(store, rel.type, rel.key);
            }
        }
    }

    get(id) {
        return this.store.getIn([this.type,id]);
    }

    set(id, val) {
        Object.assign(val, this.mixin);
        this.store.setIn([this.type, id], fromJS(val));
    }
}

class IndexedListStore {
    constructor(store, type, returnType) {
        this.store = store;
        this.type = type;
        this.returnType = returnType;
    }

    get(id) {
        return this.store.getIn([this.type, id]).map(pid => this.store.stores[this.returnType].get(pid));
    }

    set(id, val) {
        this.store.setIn([this.type, id], fromJS(val));
    }
}

class PagedListStore {

    //{
    //    "{hash}": {
    //        hash: "{hash}",
    //        filter: {
    //            // ...
    //        },
    //        total: 1234,
    //        pages: {
    //            1: [ "abc", "def", "ghi" /*, ... */],
    //            2: [ "jkl", "mno", "pqr" /*, ... */],
    //            // ...
    //        }
    //    }
    //}

    constructor(store, name, type, hasher) {
        this.store = store;
        this.name = name;
        this.type = type;
        this.hasher = hasher;
    }

    get(hash) {
        return this.store.getIn([this.name, hash]);
    }

    set(hash, val) {
        var path = [this.name, hash];
        if (!this.store.hasIn(path)) {
            this.skeleton(hash, val.filter);
        }

        this.store.setIn([this.name, hash, 'total'], val.total);

        for (var page in val.pages) {
            this.setPage(hash, page, val.pages[page]);
        }
    }

    setPage(hash, page, items) {
        this.store.setIn([this.name, hash, 'pages', page], fromJS(items));
    }

    skeleton(hash, filter) {
        this.store.setIn([this.name, hash], Map({
            hash: hash,
            filter: filter,
            total: null,
            pages: Map()
        }));
    }
}

// example spec
module.exports = Store({
    types: {
        post: {
            author: { type: "member", key: "authorId" },
            comments: { type: ["comment"], key: "postId" }
        },
        link: {
            author: { type: "member", key: "authorId" },
            submitter: { type: "member", key: "submitterId" },
            comments: { type: ["comment"], key: "postId" }
        },
        organization: {
            roster: { type: ["employment"], key: "organizationId" }
        },
        employment: {
            organization: { type: "organization", key: "organizationId" }
        },
        comment: {
            parent: { type: "comment", key: "parentId", nullable: true },
            author: { type: "member", key: "authorId" },
            children: { type: ["comment"], key: "parentId" }
        },
        member: {
            "workHistory": { type: ["employment"], key: "memberId" }
        }
    },
    views: {
        search: { type: "post" }
    }
});