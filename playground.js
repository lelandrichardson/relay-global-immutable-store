

// example POST to the server
// ================================


var payload = {
    //localTime: "2015-05-08T18:10:48.038Z",
    lastSyncTime: "2015-05-08T18:10:48.038Z",
    events: [
        {
            $id: "0cdc73e1-a1a1-4c94-96f6-e38f11848bcb",
            $op: "PUT",
            $at: "2015-05-08T18:10:48.038Z",
            $resource: "foo",
            $data: {
                id: "a34921c6-2627-4dde-9209-a9d7872e5dfe",
                title: "some foo title",
                body: "lorem ipsum foo body text ipsum lorem"
            }
        },
        {
            $id: "97c4e7dd-cab4-41a9-8a96-93506d6b35f9",
            $op: "GET",
            $at: "2015-05-08T18:10:47.038Z",
            $resource: "foo",
            $data: {
                id: "a34921c6-2627-4dde-9209-a9d7872e5dfe" // <-- the id of the inserted post from the event above
            }
        },
        {
            $id: "37bf4cfe-6798-44fe-902a-574c95403408",
            $op: "GET",
            $at: "2015-05-08T18:10:47.038Z",
            $resource: "foo/list",
            $data: {
                query: "bar",
                sort: "popular"
            }
        },
        // ...
    ]
};



// example response from the server
// ================================

var response = {
    asOf: "2015-05-08T18:10:47.038Z",

    // any data that was requested or is
    data: {
        "foo/list": [
            {
                // lists are kind of tricky, as a given search doesn't normally have a convenient "identifier"
                // one thing we could do is take an MD5 hash of the search data and then reuse it if it's the same.
                // The alternative is to either never reuse the data, or implement the full search stack on both
                // the client and the server, which also seems like a bad option.
                // right now i'm using the posted $id to identify the search results, but there might
                // be a better way...
                $id: "37bf4cfe-6798-44fe-902a-574c95403408", // <-- this was the $id of the posted event.
                results: [
                    "a34921c6-2627-4dde-9209-a9d7872e5dfe",
                    "5d86d159-cd67-4ef0-b1c6-bd3c7c2d5923",
                    "071ea6b8-614e-4f4a-89d3-bf36091f18e0",
                    // ...
                ]
            }
        ],
        foo: [
            {
                id: "a34921c6-2627-4dde-9209-a9d7872e5dfe",
                title: "some foo title",
                body: "lorem ipsum foo body text ipsum lorem",
                dateCreated: "2015-05-08T18:10:47.038Z",
                authorId: "86bd8b86-b618-459f-bb91-daf5aa62b697"
            },
            {
                id: "5d86d159-cd67-4ef0-b1c6-bd3c7c2d5923",
                title: "another foo",
                body: "lorem ipsum foo body text ipsum lorem",
                dateCreated: "2015-05-08T18:10:47.038Z",
                authorId: "85e3ea2a-bca3-47b4-9ae1-ee6a3b74927f"
            },
            {
                id: "071ea6b8-614e-4f4a-89d3-bf36091f18e0",
                title: "even another one, but same author",
                body: "lorem ipsum foo body text ipsum lorem",
                dateCreated: "2015-05-08T18:10:47.038Z",
                authorId: "86bd8b86-b618-459f-bb91-daf5aa62b697"
            },
            // ...
        ],
        user: [
            {
                id: "86bd8b86-b618-459f-bb91-daf5aa62b697",
                name: "Leland Richardson",
                // ...
            },
            {
                id: "86bd8b86-b618-459f-bb91-daf5aa62b697",
                name: "John Smith",
                // ...
            },
            // ...
        ]
    }
};



// thoughts on how we might declare the global store:
// ==================================================

function Store(spec) {}
function Entity(spec) {}
function IndexedList() {}
function PagedList(entity) {}
function Relationship(entity, idProp) {}
function OneToMany(entity, foreignKey) {}


// my global store
module.exports = Store({

    // Entities
    // ========

    "post": Entity({
        "author": Relationship("member", "authorId"),
        "comments": OneToMany("comment", "postId")
    }),

    "organization": Entity({
        "roster": OneToMany("employment", "organizationId")
    }),

    "employment": Entity({
        "organization": Relationship("organization", "organizationId"),
        "employee": Relationship("member", "memberId")
    }),

    "comment": Entity({
        "parent": Entity("comment","parentId"),
        "author": Relationship("member", "authorId"),
        "children": OneToMany("comment", "parentId")
    }),

    "member": Entity({
        "workHistory": OneToMany("employment", "memberId")
    }),


    // Data Sets
    // =========

    "post::search": PagedList("post"),


});

// This would result in a data structure like...

var globalState = {
    "post": {
        "abc": {
            id: "abc",
            title: "some title",
            authorId: "def",
            author: () => this.get("member","def") // a getter function basically represents a 1:1 relationship
            // ...
        },
        "ghi": {
            id: "ghi",
            title: "some other title",
            authorId: "jkl",
            // ...
        }
    },
    "comments": {
        "mno": {
            id: "mno",
            parentId: null,
            authorId: "stu",
            body: "my comment",
            //...
        },
        "pqr": {
            id: "pqr",
            parentId: "mno",

            authorId: ""
        },
        // ...
    },
    "member": {
        "stu": {
            id: "stu",
            name: "Leland Richardson",
            // ...
        },
        "vwx": {
            id: "vwx",
            name: "John Smith",
            // ...
        },
        "def": {
            id: "def",
            name: "Jane Doe",
            // ...
        }
    },

    // this represents a one: many relationship, (postId => [commentId])
    "post:comment.postId": {
        "abc": [
            "mno",
            "pqr",
            // ...
        ],
        "ghi": [
            // ...
        ]
    },

    // lists will result in an object whose keys are the MD5 hashes of their filter objects.
    // the key's value will be a search object with the filter (which produced the key), some
    // meta data about the search results, and then a `pages` object which maps the page number
    // to an array of entity ids (in this case post Ids)
    "post::search": {
        "f2h38u40928ujrk2or09mh203rh7": {
            hash: "f2h38u40928ujrk2or09mh203rh7",
            filter: {
                // ...
            },
            total: 1234,
            pages: {
                1: [ "abc", "def", "ghi" /*, ... */],
                2: [ "jkl", "mno", "pqr" /*, ... */],
                // ...
            }
        }
    }

};






/*

 Things to figure out:
 =====================

 - paged result sets. maybe cursors?
 - 1:many relationships
 - 1:1 relationships
 - many:many relationships
 - for relationships, we may want to be able to differentiate between knowing
   that a relationship is empty, versus just not downloaded yet
 - do we want to implement lazy loading? is the store itself responsible for retreiving the
   data on the server side?
 - if we are using some GUID generator to generate the ids for every entity, we could actually
   just store every entity inside the same map...  which would maybe simplify things?



 Notes
 =====================

 - currently would require unique ids to be able to be generated locally
 - if we follow REST resource conventions, we can make migrating to this sort of a system easier
 - we could batch requests, which would help with speed to an extent


 */





/**
 * A "List" Store holds an ordered list of identifiers. Typically, this is used
 *
 * The data storage typically looks something like:
 *
 * ```
 *  [ "abc", "def", "xky", ... ]
 * ```
 */

/**
 * An "Indexed List" Store is a set of id lists, indexed by id. This is essentially a storage mechanism for 1:many
 * relationships in memory. A canonical example for this might be a Store that stores the set of "Order" entities
 * for a given "Customer".
 *
 * The data storage typically looks something like:
 *
 * ```
 *  {
 *      "abc": [ "xyz", "r23", "thq", ... ],
 *      "def": [ "xyz", "r23", "thq", ... ],
 *      ...
 *  }
 * ```
 *
 */

/**
 * A "Content Store" holds app entities as a hash-map based on some identifier. This store becomes the "source of truth"
 * for entities of that type. Typically, other types of stores like "List" Stores or "IndexedList" Stores will ask
 * content stores for their data.
 *
 * The data storage typically looks something like:
 *
 * ```
 *  {
 *      "abc": {
 *          "_id": "abc",
 *          ...
 *      },
 *      "def": {
 *          "_id": "def",
 *          ...
 *      },
 *      ...
 *  }
 * ```
 */




















