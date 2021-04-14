// date: 2020-07-01
// author: dengxiangyu
// descr: 删除模型

var ctx = new WorkflowRuntimeContext()
var input = ctx.input()
var ecu = ctx.getECU()

var configIndexId = "cmdb_index-1bkr6gd6rg2cs"
var modelIndexId = "cmdb_index-1llredm1yz8zm"
var fieldSchemaId = "cmdb_schema_x-2cc07zkxuurwn"
var indexId = "cmdb_index-36ylwj69mshlq"
var indexConfgSchemaId = "cmdb_schema_x-2bbnpb7xawvdc"
var pkgSchemaId = "cmdb_schema_x-ghkfn72ezw6k"
var auditLogSchemaId = "cmdb_schema_x-a307mljaapl2"
var readOnlyIndexId = "cmdb_index-3b01as46nc0b7"
var endPointSchemaId = "cmdb_schema_x-1hit9xy30m747"




var output = {
    "result": "SUCCEEDED",
    "result_name": "删除成功",
    "message": "删除成功"
}

function paramCheck() {
    if (input.idList.length === 0) {
        throw { "message": "请传模型id" };
    }
}


function rollback(ids) {
    if (ids.lenght) {
        ctx.ecu.cmdb.updateObjects({
            "conditions": [
                {
                    "field": ".inode.id",
                    "op": "=-",
                    "value": ids
                }
            ],
            "objects": [
                "$conditions"
            ]
        }, {
            "object": {
                "inode": {
                    "archived": false
                }
            },
            "updates": [".inode.archived"]
        });
    }
}


// 检查模型配置被哪些索引配置关联，索引配置是否被其他模型配置字段使用
function checkIndex(config_id, pkg_id_list,ids) {
    // 检查关联了该模型配置的索引配置，是否有被字段使用
    var cmdbQl1 = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": ".inode.schema_id",
                "op": "=",
                "value": fieldSchemaId
            },
            {
                "field": ".indexes.cmdb_index-1rpqm2p9dxpuq", // 字段关联到模型配置	
                "op": "=",
                "value": config_id
            }
        ],
        "selects": ["."]
    }
    res = ctx.ecu.cmdb.queryObjects(cmdbQl1)
    if (res.total_count !== 0) {
        field_name = res.objects[0]["data"]["field_name"]
        relation_config_id = res.objects[0]["indexes"][indexId]["inode"]["id"]
        res1 = ctx.ecu.cmdb.queryObjects( // 查询索引配置被哪个模型的哪个字段使用
            {
                "objects": [relation_config_id],
                "conditions": [
                    {
                        "field": ".inode.id",
                        "op": "=",
                        "value": relation_config_id
                    }
                ],
                "selects": [".inode"]
            }
        )
        if (res1.total_count !== 0) {
            config_name = res1.objects[0]["inode"]["name"]
            message = "已被" + config_name + "(模型)的" + field_name + "(字段)使用";
            throw { "message": message };
        }
    }

    // 检查关联了该模型配置的索引配置
    var cmdbQl2 = {
        "objects": [indexConfgSchemaId],
        "conditions": [
            {
                "field": "inode.schema_id",
                "op": "=",
                "value": indexConfgSchemaId
            },
            {
                "field": "indexes.cmdb_index-1m8g2lnhu7s0u",  // 关联索引类型
                "op": "=",
                "value": config_id
            }
        ],
        "selects": []
    }
    res2 = ctx.ecu.cmdb.queryObjects(cmdbQl2)
    if (res2.total_count !== 0) {
        for (i = 0; i < res2.objects.length; i++) {
            index_id = res2["objects"][i].inode.id
            ids.push(index_id)
        }
    }

    // 检查关联了该数据模板的索引配置
    var cmdbQl3 = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": "inode.schema_id",
                "op": "=",
                "value": indexConfgSchemaId
            },
            {
                "field": "indexes.cmdb_index-2juvlwf06k1a1",  // 关联数据模板
                "op": "=-",
                "value": pkg_id_list
            }
        ],
        "selects": ["."]
    }
    res3 = ctx.ecu.cmdb.queryObjects(cmdbQl3)
    // output["indexToPkg"] = res3
    if (res3.total_count !== 0) {
        for (i = 0; i < res3.objects.length; i++) {
            indexConfig_id = res3["objects"][i].inode.id
            index_id = res3["objects"][i].data.index_id
            ids.push(indexConfig_id)
            ids.push(index_id)
        }
    }
}


// 查询该模型下包含哪些字段
function checkField(config_id,ids) {
    var cmdbQl = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": ".inode.schema_id",
                "op": "=",
                "value": fieldSchemaId
            },
            {
                "field": "indexes.cmdb_index-36ylwj69mshlq", // 字段归属摸个模型
                "op": "=",
                "value": config_id
            }
        ],
        "selects": ["."]
    }
    var res = ctx.ecu.cmdb.queryObjects(cmdbQl)
    if (res.total_count === 0) {
        return
    } else {
        var data = res["objects"];
        for (i = 0; i < data.length; i++) {
            var field = data[i]
            if (field.data.field_type !== "id") {
                ids.push(field.inode.id)
            }
        }
    }
}


// 归档对象
function deleteObject(ids) {
    cmdbQl = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": "inode.id",
                "op": "=-",
                "value": ids
            }
        ]
    }
    cmdbObject = { "inode": { "archived": true } }
    updates = [".inode.archived"]
    result = ctx.ecu.cmdb.updateObjects(
        cmdbQl,
        {
            "object": cmdbObject,
            "updates": updates
        }
    )
}

function relationshipCheck(config_id,ids) {
    var cmdbQl = {
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
    var res = ctx.ecu.cmdb.queryObjects(cmdbQl)
    if (res.objects.length > 0) {
        var data = res["objects"][0]["data"]
        var indexes = res["objects"][0]["indexes"]
    } else {
        throw { "message": "未找到模型配置" }
    }


    // 删除worlfolw
    if (data["workflows"] && data["workflows"]["batch_update"]) {
        ids.push(data["workflows"]["batch_update"])
    }
    if (data["workflows"] && data["workflows"]["create"]) {
        ids.push(data["workflows"]["create"])
    }
    if (data["workflows"] && data["workflows"]["delete"]) {
        ids.push(data["workflows"]["delete"])
    }
    if (data["workflows"] && data["workflows"]["update"]) {
        ids.push(data["workflows"]["update"])
    }

    // 删除模型关联的索引配置
    if (indexes[configIndexId]) {
        for (i = 0; i < indexes[configIndexId].length; i++) {
            ids.push(indexes[configIndexId][i]["inode"]["id"])
        }
    }

    var model_id = indexes[modelIndexId]["inode"]["id"]
    ids.push(config_id)
    ids.push(model_id)
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
            throw { "message": "模型只读,不能删除" }
        } 
        modelData = {
            "id": obj.inode.id,
            "name": obj.inode.name,
            "describe": obj.inode.descr,
            "menu_visible": obj.data.menu_visible
        }

    } else {
        throw { "message": "未找配置对应模型" }
    }
    // var result = ctx.ecu.cmdb.queryObjects(
    //     {
    //         "objects": ["$conditions"],
    //         "conditions": [
    //             {
    //                 "field": "inode.schema_id",
    //                 "op": "=",
    //                 "value": schema_id
    //             }
    //         ]
    //     }
    // )
    // if (result.total_count > 0) {
    //     throw { "message": "该模型下有数据,不能删除" }
    // }
    return modelData
}

// 检查哪些数据模板关联了模型配置
function checkPkg(config_id,ids) {
    // 查询模型配置关联的数据模板
    var pkg_id_list = []
    var cmdbQl = {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": ".inode.schema_id",
                "op": "=",
                "value": pkgSchemaId
            },
            {
                "field": ".indexes.cmdb_index-5idpkmb7eqne", // 数据模板关联模型配置
                "op": "=",
                "value": config_id
            }
        ],
        "selects": ["."]
    }
    res = ctx.ecu.cmdb.queryObjects(cmdbQl)
    output["pkg"] = res //debug
    if (res.total_count > 0) {
        for (var i = 0; i < res.objects.length; i++) {
            obj = res.objects[i]
            pkg_id = obj["inode"]["id"]
            pkg_id_list.push(pkg_id)
            ids.push(pkg_id)
            if (obj.data.object_id) {
                ids.push(obj.data.object_id)
            }
            if (obj.data.ql) {
                ids.push(obj.data.ql)
            }
        }
    } else {
        return
    }
    return pkg_id_list
}

function deletePage(config_id) {
    // 删除页面
    var res1 = ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput(
        "cmdb_workflow-25kyfv02w3juc",
        {
            "model_id": config_id
        },
        "normal"
    )
    if (res1.output && res1.output.result && res1.output.result === "SUCCEEDED") {
        return
    } else {
        throw { "message": "删除页面失败" }
    }
}


function auditLog(config_id, audit_log) {
    ctx.ecu.cmdb.createObjects(
        [
            {
                "inode": {
                    "schema_id": auditLogSchemaId,
                    "name": audit_log.name
                },
                "data": {
                    "record": JSON.stringify(audit_log),
                    "type": "删除" + audit_log.name + "模型",
                },
                "indexes": {
                    "cmdb_index-3g1k2esdytnah": config_id,
                }

            }
        ]
    )
}


function checkEndpoint(config_ids) {
    var cmdbQl = 
    {
        "objects": ["$conditions"],
        "conditions": [
            {
                "field": ".inode.schema_id",
                "op": "=",
                "value": endPointSchemaId
            },
            {
                "field": ".indexes.cmdb_index-1n8z4e1hp24xn",
                "op": "=-",
                "value": config_ids
            }
        ]
    }
    var result = ctx.ecu.cmdb.queryObjects(
        cmdbQl
    )
    if (result.total_count > 0) {
        throw { "message": "请检查是否有api使用了该数据模板" }
    }
}

function main() {
    // 0.参数检查
    paramCheck()
    var idList = input.idList

    // 检车是否有endpoint 在使用该模型
    checkEndpoint(idList)


    for (var i = 0; i < idList.length; i++) {
        var ids = []
        var config_id = idList[i]

        // 检查数据模板
        var pkg_id_list = checkPkg(config_id,ids)

        // 检查模型是否存在对象,并记录模型数据
        var audit_log = checkObject(config_id)

        // 模型配置中关联的工作流id,ql_id,关联的索引id,并把id加入ids数组
        relationshipCheck(config_id,ids)

        // 查询该模型下包含哪些字段
        checkField(config_id,ids)

        // 检查是否有索引关联该模型或关联数据模板
        checkIndex(config_id, pkg_id_list,ids)
        output["ids"] = ids

        // 删除页面
        deletePage(config_id)

        // 审计日志
        auditLog(config_id, audit_log)

        // 删除模型配置
        deleteObject(ids)
    }
}
try {
    main();
} catch (e) {
    //rollback()
    output["result"] = "FAILED"
    output["result_name"]  = "删除失败"
    output["message"] = e.message
}

ctx.output(output)