/**
 * - ECS资源同步到「服务器」模型
 **/

var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据

//模型ID
var SCHEMA_SERVER = "cmdb_schema_u_crf_server-0" //云服务器
var SCHEMA_RDS = "cmdb_schema_u_crf_cloud_rds-0" // 关系型数据库
var SCHEMA_KV = "cmdb_schema_u_crf_redis-0" //redis
var SCHEMA_Mongo = "cmdb_schema_u_crf_mongodb-0" //mongo
var SCHEMA_SLB = "cmdb_schema_u_crf_slb-0" //mongo
var SCHEMA_Tree = "cmdb_schema_u_tree-0" //业务树

//索引ID
var INDEX_TREE = "cmdb_index-18gs5gfejka3i" // 关联的业务树
var INDEX_LAYER = "cmdb_index-2sl8fe4yktkn4" // 业务树层级
var INDEX_tree_mark = "cmdb_index-23vblwi61ybha" //业务树同步标记
var INDEX_external_id = "cmdb_index-309gefsjwfa5q" //业务树外部ID
var INDEX_node_level = "cmdb_index-2sl8fe4yktkn4" //业务树层级

//用作维护业务树和自动打标的资源
// var SCHEMA_AUTO_IDS = [SCHEMA_SERVER] // 服务器、关系型数据库
var SCHEMA_AUTO_IDS = [SCHEMA_SERVER, SCHEMA_RDS, SCHEMA_KV, SCHEMA_Mongo, SCHEMA_SLB] // 服务器、关系型数据库、Redis、Mongodb

// 获取所有实例,使用 SCHEMA_AUTO_IDS 中的所有模型
function getInstances() {
    var ret = []
    var Query = {
        objects: ["$conditions"],
        conditions: [{
                field: "inode.schema_id",
                op: "=-",
                value: SCHEMA_AUTO_IDS
            },
            //   { field: "inode.name", op: "=", value:  "tva_sh_ali_rankboard_1"}
        ],
        selects: [
            ".indexes." + INDEX_TREE + ".inode.id",
            ".inode.name",
            ".data.hostname",
            ".inode.schema_id"
        ],
        // limit: 100
    };
    var queryResult = ctx.ecu.cmdb.queryObjects(Query).objects;

    //循环检查符合规则的 inode.name 并返回
    queryResult.forEach(function (data) {
        var info = checkRule(data.inode.name)
        if (info.match) {
            // var info = rewriteRule(data.inode.name)
            ret.push({
                id: data.inode.id,
                name: data.inode.name,
                schema: data.inode.schema_id,
                tree_id: info.tree_id
            })
        }
    });
    return ret
}

// 检查规则，莉莉丝定制规则
function checkRule(name) {
    var ret = {
        match: false
    }
    // var info = splitHost(hostname)
    var info = name.split('-')
    if (info.length == 5) {
        if (info[1].indexOf("plat2") == 0) {
            ret.match = true
            ret["tree_id"] = "plat2-" + info.slice(1, 4).join("-")
            return ret
        }
        if (name.indexOf("master") != 0 && name.indexOf("worker") != 0 && name.indexOf("em2") != 0) {
            ret.match = true
            ret["tree_id"] = info.slice(1, 4).join("-")
            return ret
        }
    }

    return ret
}

// 更新业务树，莉莉丝定制规则
function updateTree(instances) {
    var syncMarker = new Date().getTime();
    var Tree_datas = []
    //将所有名称加入数组并去重，用作更新服务树
    instances.forEach(function (data) {
        // var name = data.name.split('-')
        // Tree_datas.push(name.slice(1, 4).join("-"))
        Tree_datas.push(data.tree_id)
    });
    var Tree = unique(Tree_datas)
    //处理业务树
    // //获取根节点
    // var targetObj = {
    //     inode: {
    //         name: "root",
    //         schema_id: SCHEMA_Tree
    //     },
    //     indexes: {}
    // }
    // targetObj.indexes["cmdb_index-2sl8fe4yktkn4"] = "0"
    // targetObj.indexes[INDEX_external_id] = "root_0"
    // targetObj.indexes[INDEX_tree_mark] = syncMarker.toString()
    // var root_tree = upsertObject("root_0", SCHEMA_Tree, targetObj, ["."])
    //循环业务树列表，进行增删改
    Tree.forEach(function (tree_data) {
        var node_level = 1
        // var parent_tree = root_tree
        var parent_tree = null
        tree_data.split('-').forEach(function (x) {
            // var level
            var externalId = tree_data.split('-').slice(0, node_level).join("-")
            var targetObj = {
                inode: {
                    id: "cmdb_tree:" + externalId,
                    name: x,
                    schema_id: SCHEMA_Tree
                },
                indexes: {}
            }
            targetObj.indexes[INDEX_tree_mark] = syncMarker.toString()
            targetObj.indexes[INDEX_external_id] = externalId
            targetObj.indexes[INDEX_node_level] = node_level.toString()
            targetObj.indexes[INDEX_TREE] = parent_tree
            //更新、插入业务数
            parent_tree = upsertObject(externalId, SCHEMA_Tree, targetObj, ["."])
            node_level++
        })
    })
    //清除业务树
    archiveObjects(syncMarker.toString())
}

//更新、插入对象
function upsertObject(externalId, schema_id, targetObj, updates) {
    var updateQuery = {
        objects: ["$conditions"],
        conditions: [{
                field: "inode.schema_id",
                op: "=",
                value: schema_id
            },
            {
                field: "indexes." + INDEX_external_id,
                op: "=",
                value: externalId
            }
        ],
        limit: 1,
        selects: [".inode.id"]
    };
    var ret = ctx.ecu.cmdb.updateObjects(updateQuery, {
        object: targetObj,
        updates: updates,
    }, {
        no_audit: true
    });
    if (ret.update_count == 0) {
        ctx.ecu.cmdb.createObjects([targetObj]);
        //   return ;
    }
    ret = ctx.ecu.cmdb.queryObjects(updateQuery)
    //获取更新或插入对象的cmdbid
    return ret.objects[0].inode.id
}

//归档对象
function archiveObjects(marker) {
    var archiveQuery = {
        objects: ["$conditions"],
        conditions: [{
                field: "inode.schema_id",
                op: "=",
                value: SCHEMA_Tree
            },
            {
                field: "indexes." + INDEX_tree_mark,
                op: "!=",
                value: marker
            }
        ]
    };
    ctx.ecu.cmdb.updateObjects(archiveQuery, {
        object: {
            inode: {
                archived: true
            }
        },
        updates: ["inode.archived"]
    });
}

//获取业务树id
function get_tree_id(externalId) {
    var Query = {
        objects: ["$conditions"],
        conditions: [{
                field: "inode.schema_id",
                op: "=",
                value: SCHEMA_Tree
            },
            {
                field: "indexes." + INDEX_external_id,
                op: "=",
                value: externalId
            }
        ],
        limit: 1,
        selects: [".inode.id"]
    };
    ret = ctx.ecu.cmdb.queryObjects(Query)
    return ret.objects[0].inode.id
}

// 更新资源和业务树关系
function updateRel(instances) {
    var updates = [".indexes." + INDEX_TREE]
    //将符合规则的资源进行打标
    instances.forEach(function (ins) {
        var tree_id = get_tree_id(ins.tree_id)
        var schema_id = ins.schema
        var id = ins.id
        var object = {
            "indexes": {}
        }
        object.indexes[INDEX_TREE] = tree_id

        var query = {
            objects: ["$conditions"],
            conditions: [{
                    field: "inode.schema_id",
                    op: "=",
                    value: schema_id
                },
                {
                    field: "inode.id",
                    op: "=",
                    value: id
                }
            ],
            selects: [".inode.id"]
        }
        ctx.ecu.cmdb.updateObjects(query, {
            object: object,
            updates: updates
        }, {
            no_audit: true
        });
    });
    //将不在业务树中的资源进行清理
    var object = {
        "indexes": {}
    }
    object.indexes[INDEX_TREE] = ""
    var query = {
        objects: ["$conditions"],
        conditions: [{
                field: "inode.schema_id",
                op: "=-",
                value: SCHEMA_AUTO_IDS
            },
            {
                field: ".indexes." + INDEX_TREE,
                op: "=-",
                value: {
                    objects: ["$conditions"],
                    conditions: [{
                            field: "inode.schema_id",
                            op: "=",
                            value: SCHEMA_Tree
                        },
                        {
                            "field": "inode.archived",
                            "op": "=",
                            "value": 1
                        }
                    ],
                    selects: [".inode.id"]
                }
            }
        ],
        selects: [".inode.id"]
    }
    ctx.ecu.cmdb.updateObjects(query, {
        object: object,
        updates: updates
    }, {
        no_audit: true
    });

}

//数组去重
function unique(arr) {
    return arr.filter(function (item, index, arr) {
        //当前元素，在原始数组中的第一个索引==当前索引值，否则返回当前元素
        return arr.indexOf(item, 0) === index;
    });
}

function main() {
    //获取所有需要数据自维护的对象
    var instances = getInstances()
    // 维护业务树
    updateTree(instances)
    //资源打标
    updateRel(instances)
}

main()
ctx.output({
    ok: true
})