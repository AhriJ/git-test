// date: 2020-06-16
// author: dengxiangyu
// describe: 更新模型


var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据
var ecu = ctx.getECU()

var auditSchemaId = "cmdb_schema_x-a307mljaapl2" // 模型配置更改记录id

var output = {
    "result": "SUCCEEDED",
    "result_name": "更新模型成功",
    "message": "更新模型成功"
}


function auditLog(id, audit_log, name) {
    var result = ctx.ecu.cmdb.createObjects(
        [
            {
                "inode": {
                    "schema_id": auditSchemaId,
                    "name": name
                },
                "data": {
                    "record": JSON.stringify(audit_log),
                    "type": "更新" + name + "模型",
                },
                "indexes": {
                    "cmdb_index-3g1k2esdytnah": id,
                }

            }
        ]
    )
    if (result.flag == false) {
        throw { "message": "修改审计日志失败" }
    }

}


function paramCheck() {
    if (!input["id"]) {
        throw { "message": "请传id" }
    }
    if (!input["name"]) {
        throw { "message": "请传name" }
    }
    return
}

function queryObject(id) {
    var flag = true
    CMDBQL = { "conditions": [], "objects": [id], "sorts": [], "selects": ["."], "vars": {} }
    tmp = ctx.ecu.cmdb.queryObjects(
        CMDBQL
    )
    // return tmp
    if (tmp.total_count != 1) {
        flag = false
        return { "flag": flag, "result": "failed" }
    }
    else {
        return { "flag": flag, "result": tmp }
    }
}

function updateObject(id, name, describe, icon, menu_visible,group) {

    var cmdbQl = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": "inode.id",
                "op": "=",
                "value": id
            }
        ],
        "selects": [],
        "multi": false,
        "comment": ""
    }
    var cmdbObject = {
        "inode": {
            "name": name,
            "descr": describe,
        },
        "data": {
            "icon": icon,
            "menu_visible": menu_visible,
            "name": name,
            "group":group
        },
    }
    var updates = [
        ".inode.name",
        ".inode.descr",
        ".data.describe",
        ".data.icon",
        ".data.menu_visible",
        ".data.name",
        ".data.group"
    ]
    var res = ctx.ecu.cmdb.updateObjects(
        cmdbQl,
        {
            "object": cmdbObject,
            "updates": updates
        }
    )
    // 更新模型配置
    if (res.update_count !== 1 && res.failed_count !== 0) {
        throw { "message": "更新模型失败" }
    }

    // 更新资源模型
    var res = ctx.ecu.ql.queryQlTable(
        {

            "objects": [id],
            "selects": ["."]
        }
    )
    var schema_id = ""
    if (res.rows.length === 1) {
        var obj = res.rows[0]["data"][1]
        schema_id = obj["indexes"]["cmdb_index-1llredm1yz8zm"]
    } else {
        return 
    }

    var cmdbObject = {
        "inode": {
            "name": name,
            "descr": describe,
        }
    }

    var updates = [
        ".inode.name",
        ".inode.descr",
    ]
    var res = ctx.ecu.cmdb.updateObjects(
        {
            objects: [schema_id]
        },
        {
            "object": cmdbObject,
            "updates": updates
        }
    )
    if (res.update_count !== 1 && res.failed_count !== 0) {
        throw { "message": "更新资源模型失败" }
    }
    
}


function checkObject(config_id) {
    var modelData
    var result = ctx.ecu.cmdb.queryObjects(
        {
            "objects": [config_id],
            "conditions": [
                {
                    "field": "inode.id",
                    "op": "=",
                    "value": config_id
                }
            ],
            "selects": ["."]
        }
    )
    if (result.total_count === 1) {
        var obj = result.objects[0]
        var readOnly = obj["indexes"][readOnlyIndexId]
        if (readOnly) {
            throw { "message": "模型只读,不能修改" }
        }
    }
}

function syncModel(config_id) {
    var result = ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput("cmdb_workflow-21xj8i0x22wdz", {
        "config_id": config_id,
        "skip_page": true
    }, "normal");
    if (!result.output || result.output.result !== "SUCCEEDED") {
        throw { "message": "调用生成对象操作工作流失败" }
    }
}

function main() {
    // 0.输入检查
    paramCheck()
    var id = input["id"]  // config_id
    var icon = input["icon"]
    var describe = input["describe"]
    var name = input["name"]
    var menu_visible = input["menu_visible"]
    var group = input["group"]
    var audit_log = {
        "id": id,
        "describe": describe,
        "name": name,
        "menu_visible": menu_visible
    }

    // 1.修改模型配置 
    updateObject(id, name, describe, icon, menu_visible,group)

    // 调用更新[cmdb]创建/更新模型列表/详情页, workflow_id:cmdb_workflow-ur1ij3pwks25
    syncModel(id)

    // 2.记录审计日志
    auditLog(id, audit_log, name)
}
try {
    main()
} catch (e) {
    output["result"] = "FAILED"
    output["result_name"] = "更新模型失败"
    output["message"] = e.message
}
ctx.output(output)