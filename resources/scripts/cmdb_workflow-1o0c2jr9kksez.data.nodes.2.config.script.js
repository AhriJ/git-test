// date: 2020-11-02
// author: dengxiangyu
// describe: 归档同步任务


var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据

var output = {
    "result": "SUCCEEDED",
    "result_name": "归档成功",
    "message": "归档成功"
}

var syncSchemaId = "cmdb_schema_x-15tw76s1zwieb"
var archived_list = []
var map_list = []

function archivedObjects() {
    var res = ctx.ecu.cmdb.updateObjects(
        {
            "objects": ["$conditions"],
            "conditions": [
                {
                    "field": "inode.id",
                    "op": "=-",
                    "value": archived_list
                }
            ]
        },
        {
            "object": {
                "inode": {
                    "archived": true
                }
            },
            "updates": ["inode.archived"]
        }
    )

    if (res.failed_count !== 0) {
        throw { "message": "归档失败" }
    }
}

function queryTasks() {
    var updateQl = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": "inode.schema_id",
                "op": "=",
                "value": syncSchemaId
            },
            {
                "field": "indexes.cmdb_index-10xq2ljxgar24",
                "op": "=-",
                "value": map_list
            }
        ],
        "selects": ["."]
    }
    var res = ctx.ecu.cmdb.queryObjects(updateQl)
    res.objects.forEach(function (element) {
        var map_id = element.inode.id
        archived_list.push(map_id)
    })
}

function rollback() {
    ctx.ecu.cmdb.updateObjects(
        {
            "objects": archived_list,
        },
        {
            "object": {
                "inode": {
                    "archived": false
                }
            },
            "updates": ["ionde.archived"]
        }
    )
}
function main() {
    var ids = input.ids
    var res = ctx.ecu.ql.queryQlTable({ "objects": ids, "selects": ["."] })
    res.rows.forEach(function (element) {
        var inode_id = element["data"][0]
        var obj = element["data"][1]
        var task_id = obj.indexes["cmdb_index-2k76c8mz52s9v"]
        var timer_wf_id = obj.indexes["cmdb_index-ry962jcuu1ux"]
        var wf_id = obj.indexes["cmdb_index-wf"]
        var map_id = obj.indexes["cmdb_index-1vswnpvg373pv"]
        archived_list.push(inode_id)
        archived_list.push(wf_id)
        archived_list.push(timer_wf_id)
        archived_list.push(task_id)
        map_list.push(map_id)

    })
    // 查询task_id 关联的map
    output["map_list"] = map_list
    queryTasks()
    output["archived_list"] = archived_list
    archivedObjects()

}

try {
    main()
} catch (e) {
    rollback()
    output.result = "FAILED";
    output.result_name = "归档失败";
    output.message = e.message
}

ctx.output(output)
