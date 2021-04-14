// WorkflowRuntimeContext 类型对象暴露 workflow 运行时方法
var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据

/*
选择源数据模板: 获取ql,查询数据,
选择目标数据模板: 获取数据模板关联的资源模型, 获取模型schema, 匹配字段对应关系,目标字段必须有字段
选择同步的配置: 如同步间隔,是否是全量同步还是增量同步,是否是单向同步
*/


var pkgSchemaId = "cmdb_schema_x-ghkfn72ezw6k"
var dataMapSchemaId = "cmdb_schema_x-2pbxw0nnoqasc"
var dataSchemaId = "cmdb_schema_x-10ciglth11xvq"

var output = {
    "result": "SUCCEEDED",
    "result_name": "创建同步成功",
    "message": "创建同步成功"
}

function generateSyncScript(id, name, source_pkg_id, dest_pkg_id, field_map, sync_type) {
    var field_map = JSON.stringify(field_map)
    var wf_obj = {
        "inode": {
            "org": "2fsiml578lbqj",
            "schema_id": "cmdb_schema_workflow-0",
            "name": name,
        },
        "data": {
            "icon": "",
            "nodes": [
                {
                    "name": "__START__",
                    "component": "cmdb_component-vars",
                    "descr": "自定义表单",
                    "auto_run": true,
                    "settings": {},
                    "config": {
                        "schema": "{\"type\":\"object\",\"properties\":{},\"required\":[]}"
                    },
                    "inputs": {
                        "*": {
                        }
                    }
                },
                {
                    "name": "__END__",
                    "component": "cmdb_component-vars",
                    "descr": "自定义表单",
                    "auto_run": true,
                    "settings": {},
                    "config": {
                        "schema": "{\"type\":\"object\",\"properties\":{}}"
                    },
                    "debug": true,
                    "merge": {
                        "enable": true
                    },
                    "inputs": {
                        "*": "{var:未命名节点-2.output}"
                    }
                },
                {
                    "name": "未命名节点-2",
                    "component": "cmdb_component-interpreter_ecmascript",
                    "descr": "ES2015 解析组件",
                    "auto_run": true,
                    "settings": {},
                    "config": {
                        "schema": "{\"type\":\"object\",\"properties\":{\"result\":{\"type\":\"string\",\"enum\":[\"SUCCEEDED\",\"FAILED\"]},\"result_name\":{\"type\":\"string\"},\"message\":{\"type\":\"string\"},\"output\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{}}}}}",
                        "input_schema": "{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"source_pkg_id\":{\"type\":\"string\"},\"dest_pkg_id\":{\"type\":\"string\"},\"sync_type\":{\"type\":\"string\"},\"field_map\":{\"type\":\"object\",\"properties\":{}}},\"required\":[]}",
                        "output_schema": "{\"type\":\"object\",\"properties\":{}}",
                        "script": '\n' +
                            '// sync_type : increment,mirror\n' +
                            'var ctx = new WorkflowRuntimeContext()\n' +
                            'var input = ctx.input() // 获取input数据\n' +
                            '\n' +
                            'var pkgSchemaId = "cmdb_schema_x-ghkfn72ezw6k"\n' +
                            'var dataMapSchemaId = "cmdb_schema_x-15tw76s1zwieb"\n' +
                            '\n' +
                            'var output = {\n' +
                            '    "result": "SUCCESSED",\n' +
                            '    "result_name": "执行同步成功",\n' +
                            '    "message": "执行同步成功"\n' +
                            '}\n' +
                            '\n' +
                            '// 查询sync_data_map 数据\n' +
                            'function genIdMap(id) {\n' +
                            '    var source_id_map = {}\n' +
                            '    var dest_id_map = {}\n' +
                            '    var res = ctx.ecu.ql.queryQlTable(\n' +
                            '        {\n' +
                            '            "conditions": [\n' +
                            '                {\n' +
                            '                    "field": "inode.schema_id",\n' +
                            '                    "op": "=",\n' +
                            '                    "value": dataMapSchemaId\n' +
                            '                },\n' +
                            '                {\n' +
                            '                    "field": "indexes.cmdb_index-10xq2ljxgar24",\n' +
                            '                    "op": "=",\n' +
                            '                    "value": id\n' +
                            '                }\n' +
                            '            ],\n' +
                            '            "objects": ["$conditions"],\n' +
                            '            "selects": ["."]\n' +
                            '        }\n' +
                            '    )\n' +
                            '    if (res.rows.length != 0) {\n' +
                            '        res.rows.forEach(function (element) {\n' +
                            '            var obj = element.data[1]\n' +
                            '            var id = element.data[0]\n' +
                            '            var source_id = obj.data.source_id\n' +
                            '            var dest_id = obj.data.dest_id\n' +
                            '            source_id_map[source_id] = { "dest_id": dest_id, "inode_id": id }\n' +
                            '            dest_id_map[dest_id] = { "source_id": source_id, "inode_id": id }\n' +
                            '        });\n' +
                            '    }\n' +
                            '    return { "source_id_map": source_id_map, "dest_id_map": dest_id_map }\n' +
                            '}\n' +
                            '\n' +
                            '// \n' +
                            'function queryData(pkg_id) {\n' +
                            '    var res = ctx.ecu.ql.queryQlTable(\n' +
                            '        {\n' +
                            '            "conditions": [\n' +
                            '                {\n' +
                            '                    "field": "inode.schema_id",\n' +
                            '                    "op": "=",\n' +
                            '                    "value": pkgSchemaId\n' +
                            '                },\n' +
                            '                {\n' +
                            '                    "field": "inode.id",\n' +
                            '                    "op": "=",\n' +
                            '                    "value": pkg_id\n' +
                            '                }\n' +
                            '            ],\n' +
                            '            "objects": [pkg_id],\n' +
                            '            "selects": ["."]\n' +
                            '        }\n' +
                            '    )\n' +
                            '    if (!!res && res.rows.length !== 1) {\n' +
                            '        throw { "message": "查询源数据模板失败" }\n' +
                            '    }\n' +
                            '    var obj = res.rows[0]["data"][1]\n' +
                            '    var ql = obj.data.ql\n' +
                            '\n' +
                            '    var res = ctx.ecu.ql.queryQlTablePack(\n' +
                            '        ql\n' +
                            '    )\n' +
                            '    return res\n' +
                            '}\n' +
                            '\n' +
                            'function queryDestSchemaId(dest_pkg_id) {\n' +
                            '    var res = ctx.ecu.ql.queryQlTable(\n' +
                            '        {\n' +
                            '            "conditions": [\n' +
                            '                {\n' +
                            '                    "field": ".inode.schema_id",\n' +
                            '                    "op": "=-",\n' +
                            '                    "value": {\n' +
                            '                        "conditions": [\n' +
                            '                            {\n' +
                            '                                "field": ".inode.schema_id",\n' +
                            '                                "op": "=-",\n' +
                            '                                "value": [\n' +
                            '                                    "cmdb_schema_schema_x-0"\n' +
                            '                                ]\n' +
                            '                            },\n' +
                            '                            {\n' +
                            '                                "field": ".inode.id",\n' +
                            '                                "op": "=",\n' +
                            '                                "value": pkgSchemaId\n' +
                            '                            }\n' +
                            '                        ],\n' +
                            '                        "objects": [\n' +
                            '                            pkgSchemaId\n' +
                            '                        ],\n' +
                            '                        "sorts": [],\n' +
                            '                        "offset": 0,\n' +
                            '                        "multi": true,\n' +
                            '                        "selects": [\n' +
                            '                            ".inode.name",\n' +
                            '                            ".inode.schema_id",\n' +
                            '                            ".inode.lock",\n' +
                            '                            ".inode.mtime",\n' +
                            '                            ".inode.last_editor"\n' +
                            '                        ],\n' +
                            '                        "comment": "",\n' +
                            '                        "function": "db",\n' +
                            '                        "vars": {}\n' +
                            '                    }\n' +
                            '                }\n' +
                            '            ],\n' +
                            '            "objects": [\n' +
                            '                dest_pkg_id\n' +
                            '            ],\n' +
                            '            "sorts": [],\n' +
                            '            "multi": true,\n' +
                            '            "selects": [\n' +
                            '                ".indexes.cmdb_index-5idpkmb7eqne.indexes.cmdb_index-1llredm1yz8zm.inode.id",\n' +
                            '                ".data.ql"\n' +
                            '            ],\n' +
                            '            "comment": "",\n' +
                            '            "function": "db",\n' +
                            '            "vars": {}\n' +
                            '        }\n' +
                            '    )\n' +
                            '    if (res.rows.length !== 1) {\n' +
                            '        throw { "message": "未找到该数据模板对应的资源模型" }\n' +
                            '    }\n' +
                            '    var dest_schema_id = res.rows[0]["data"][1]\n' +
                            '\n' +
                            '    return dest_schema_id\n' +
                            '\n' +
                            '}\n' +
                            '\n' +
                            'function syncData(id, source_pkg_data_map, dest_pkg_data_map, index_map, id_map, dest_schema_id, updates, sync_type) {\n' +
                            '    var create_data_array = []\n' +
                            '    var update_data_array = []\n' +
                            '    var delete_data_array = []\n' +
                            '    var source_id_map = id_map["source_id_map"]\n' +
                            '    var dest_id_map = id_map["dest_id_map"]\n' +
                            '    output["source_id_map"] = source_id_map\n' +
                            '    output["dest_id_map"] = dest_id_map\n' +
                            '\n' +
                            '    // 源数据为空\n' +
                            '    if (Object.keys(source_pkg_data_map).length == 0) {\n' +
                            '        if (Object.keys(source_id_map).length = 0) {\n' +
                            '            for (var key in source_id_map) {\n' +
                            '                var map_inode_id = source_id_map[key]["inode_id"]\n' +
                            '                delete_data_array.push(map_inode_id)\n' +
                            '            }\n' +
                            '        }\n' +
                            '\n' +
                            '    } else {\n' +
                            '        // 遍历源数据\n' +
                            '        for (var key in source_pkg_data_map) {\n' +
                            '            var target = {\n' +
                            '                inode: {\n' +
                            '                    "schema_id": dest_schema_id\n' +
                            '                },\n' +
                            '                indexes: {},\n' +
                            '                data: {}\n' +
                            '            };\n' +
                            '            var value = source_pkg_data_map[key]\n' +
                            '            // 如果源数据模板对象在id_map 中\n' +
                            '            for (index in index_map) {\n' +
                            '                var v = value[index_map[index]];\n' +
                            '                if (index.substring(0, 1) === ".") {\n' +
                            '                    index = index.substring(1);\n' +
                            '                }\n' +
                            '                var indexes = index.split(".");\n' +
                            '                if (indexes.length == 2) {\n' +
                            '                    var type = indexes[0];\n' +
                            '                    var k = indexes[1];\n' +
                            '                    switch (type) {\n' +
                            '                        case "inode":\n' +
                            '                            target.inode[k] = v;\n' +
                            '                            break;\n' +
                            '                        case "data":\n' +
                            '                            target.data[k] = v;\n' +
                            '                            break;\n' +
                            '                        case "indexes":\n' +
                            '                            target.indexes[k] = v;\n' +
                            '                            break;\n' +
                            '                    }\n' +
                            '                }\n' +
                            '            }\n' +
                            '\n' +
                            '            if (!!source_id_map[key]) {\n' +
                            '                var dest_id = source_id_map[key]["dest_id"]\n' +
                            '                target.inode.id = dest_id\n' +
                            '                update_data_array.push(target)\n' +
                            '            } else {\n' +
                            '                var obj = {}\n' +
                            '                obj[key] = target\n' +
                            '                create_data_array.push(obj)\n' +
                            '            }\n' +
                            '        }\n' +
                            '        // 遍历目标数据, 查出待删除的对象id\n' +
                            '        for (var element in dest_pkg_data_map) {\n' +
                            '            if (!dest_id_map[element] && (sync_type == "mirror")) {\n' +
                            '                delete_data_array.push(element)\n' +
                            '            }\n' +
                            '        }\n' +
                            '\n' +
                            '        // 遍历dest_id_map, 更新dest_id_map\n' +
                            '        for (var element in dest_id_map) {\n' +
                            '            if (!dest_pkg_data_map[element]) {\n' +
                            '                var map_inode_id = dest_id_map[element]["inode_id"]\n' +
                            '                delete_data_array.push(map_inode_id)\n' +
                            '            }\n' +
                            '        }\n' +
                            '        // 遍历source_id_map, 更新source_id_map\n' +
                            '        for (var element in source_id_map) {\n' +
                            '            if (!source_pkg_data_map[element]) {\n' +
                            '                var map_inode_id = source_id_map[element]["inode_id"]\n' +
                            '                delete_data_array.push(map_inode_id)\n' +
                            '            }\n' +
                            '        }\n' +
                            '    }\n' +
                            '\n' +
                            '\n' +
                            '    // 更新数据\n' +
                            '    if (update_data_array.length > 0) {\n' +
                            '        update_data_array.forEach(function (element) {\n' +
                            '            ctx.ecu.cmdb.updateObjects(\n' +
                            '                {\n' +
                            '                    "objects": [element.inode.id]\n' +
                            '                },\n' +
                            '                {\n' +
                            '                    object: element,\n' +
                            '                    updates: updates\n' +
                            '                })\n' +
                            '        })\n' +
                            '\n' +
                            '    }\n' +
                            '    // 删除数据\n' +
                            '    if ( delete_data_array.length > 0) {\n' +
                            '        ctx.ecu.cmdb.updateObjects(\n' +
                            '            {\n' +
                            '                "objects": delete_data_array\n' +
                            '            },\n' +
                            '            {\n' +
                            '                "object": {\n' +
                            '                    "inode": {\n' +
                            '                        "archived": true\n' +
                            '                    }\n' +
                            '                },\n' +
                            '                "updates": ["inode.archived"]\n' +
                            '            }\n' +
                            '        )\n' +
                            '    }\n' +
                            '    // 创建数据\n' +
                            '    if (create_data_array.length > 0) {\n' +
                            '        var id_map_array = []\n' +
                            '        create_data_array.forEach(function (element) {\n' +
                            '            var source_id = Object.keys(element)[0]\n' +
                            '            var obj = element[source_id]\n' +
                            '            var res = ctx.ecu.cmdb.createObjects(\n' +
                            '                [obj]\n' +
                            '            )\n' +
                            '            var dest_id = res.objects[0]\n' +
                            '            var map_obj = {\n' +
                            '                "inode": {\n' +
                            '                    "schema_id": dataMapSchemaId\n' +
                            '                },\n' +
                            '                "data": {\n' +
                            '                    "source_id": source_id,\n' +
                            '                    "dest_id": dest_id\n' +
                            '                },\n' +
                            '                "indexes": {\n' +
                            '                    "cmdb_index-10xq2ljxgar24": id\n' +
                            '                }\n' +
                            '\n' +
                            '            }\n' +
                            '            id_map_array.push(map_obj)\n' +
                            '        })\n' +
                            '\n' +
                            '        // 更新map\n' +
                            '        ctx.ecu.cmdb.createObjects(\n' +
                            '            id_map_array\n' +
                            '        )\n' +
                            '    }\n' +
                            '\n' +
                            '    output["create_data_array"] = create_data_array\n' +
                            '    output["delete_data_array"] = delete_data_array\n' +
                            '    output["update_data_array"] = update_data_array\n' +
                            '\n' +
                            '\n' +
                            '}\n' +
                            '\n' +
                            'function main() {\n' +
                            '    var id = input.id\n' +
                            '    var source_pkg_id = input.source_pkg_id\n' +
                            '    var dest_pkg_id = input.dest_pkg_id\n' +
                            '    var field_map = ' + field_map + '\n'+
                            '    var sync_type = input.sync_type\n' +
                            '\n' +
                            '    // 查询源数据模板数据\n' +
                            '    var id_map = genIdMap(id)\n' +
                            '    var source_pkg_data = queryData(source_pkg_id)\n' +
                            '    var headers = source_pkg_data.headers\n' +
                            '\n' +
                            '    var source_pkg_data_map = {}\n' +
                            '    source_pkg_data.rows.forEach(function (element) {\n' +
                            '        var inode_id = element.data[0]\n' +
                            '        var value = element.data\n' +
                            '        source_pkg_data_map[inode_id] = value\n' +
                            '    })\n' +
                            '\n' +
                            '    // 查询目标数据模板数据\n' +
                            '    var dest_pkg_data = queryData(dest_pkg_id)\n' +
                            '    var dest_pkg_data_map = {}\n' +
                            '    var updates = []\n' +
                            '    for (var i in field_map) {\n' +
                            '        updates.push(field_map[i])\n' +
                            '    }\n' +
                            '    dest_pkg_data.rows.forEach(function (element) {\n' +
                            '        var inode_id = element.data[0]\n' +
                            '        var value = element.data\n' +
                            '        dest_pkg_data_map[inode_id] = value\n' +
                            '    })\n' +
                            '\n' +
                            '    //  数据目标数据模板关联模型schema_id\n' +
                            '    var dest_schema_id = queryDestSchemaId(dest_pkg_id)\n' +
                            '\n' +
                            '    // 目标数据的什么字段对应源数据中的index\n' +
                            '    var index_map = {}\n' +
                            '    for (var i = 0; i < headers.length; i++) {\n' +
                            '        var field_id = headers[i]["field"]\n' +
                            '        if (field_map[field_id]) {\n' +
                            '            dest_field = field_map[field_id]\n' +
                            '            index_map[dest_field] = i\n' +
                            '        }\n' +
                            '        field_id = "." + field_id\n' +
                            '        if (field_map[field_id]) {\n' +
                            '            dest_field = field_map[field_id]\n' +
                            '            index_map[dest_field] = i\n' +
                            '        }\n' +
                            '    }\n' +
                            '\n' +
                            '    output["id"] = id\n' +
                            '    output["source_pkg_data_map"] = source_pkg_data_map\n' +
                            '    output["dest_pkg_data_map"] = dest_pkg_data_map\n' +
                            '    output["index_map"] = index_map\n' +
                            '    output["id_map"] = id_map\n' +
                            '    output["updates"] = updates\n' +
                            '\n' +
                            '    syncData(id, source_pkg_data_map, dest_pkg_data_map, index_map, id_map, dest_schema_id, updates, sync_type)\n' +
                            '\n' +
                            '\n' +
                            '}\n' +
                            'try {\n' +
                            '    main()\n' +
                            '} catch (e) {\n' +
                            '    output.result = "FAILED",\n' +
                            '        output.result_name = "创建同步失败",\n' +
                            '        output.message = e.message\n' +
                            '}\n' +
                            'ctx.output(output)\n' +
                            '\n',
                        "timeout_s": 30
                    },
                    "merge": {
                        "enable": false
                    },
                    "inputs": {
                        "*": {
                            "id": id,
                            "source_pkg_id": source_pkg_id,
                            "dest_pkg_id": dest_pkg_id,
                            "field_map": field_map,
                            "sync_type": sync_type
                        }
                    }
                }
            ],
            "edges": [
                {
                    "from": "__START__",
                    "to": "未命名节点-2"
                },
                {
                    "from": "未命名节点-2",
                    "to": "__END__"
                }
            ],
            "persist_level": "job_unit",
            "persist_retention": 3600
        },
        "indexes": {}
    }
    var res = ctx.ecu.cmdb.createObjects([wf_obj])
    if (res.failed_count != 0) {
        throw { "message": "生成同步工作流失败" }
    }
    var wf_id = res["objects"][0]
    return wf_id
}

function generateTimerScript(name, wf_id, interval_time) {
    var timer_obj = {
        "inode": {
            "schema_id": "cmdb_schema_workflow-0",
            "name": "\[定时任务\]" + name,
            "descr": ""
        },
        "data": {
            "icon": "",
            "nodes": [
                {
                    "name": "__START__",
                    "component": "cmdb_component-vars",
                    "descr": "自定义表单",
                    "auto_run": true,
                    "settings": {},
                    "config": {}
                },
                {
                    "name": "__END__",
                    "component": "cmdb_component-vars",
                    "descr": "自定义表单",
                    "auto_run": true,
                    "settings": {},
                    "config": {}
                },
                {
                    "name": name,
                    "component": "cmdb_component-workflow",
                    "descr": "派生 Workflow",
                    "auto_run": true,
                    "settings": {},
                    "config": {
                        "id": wf_id
                    },
                    "merge": {
                        "enable": false
                    },
                    "inputs": {
                        "*": {},
                        "未命名节点-4": {}
                    }
                },
                {
                    "name": "未命名节点-4",
                    "component": "cmdb_component-ticker",
                    "descr": "固定时间间隔执行",
                    "auto_run": true,
                    "settings": {},
                    "config": {},
                    "merge": {
                        "enable": false
                    },
                    "inputs": {
                        "*": {
                            "interval_s": 300,
                            "times": -1
                        },
                        "__START__": {
                            "interval_s": interval_time,
                            "times": -1
                        }
                    }
                }
            ],
            "edges": [
                {
                    "from": "__START__",
                    "to": "未命名节点-4"
                },
                {
                    "from": "未命名节点-4",
                    "to": name
                }
            ],
            "persist_level": "job_unit",
            "persist_retention": 3600
        },
        "indexes": {}
    }
    var res = ctx.ecu.cmdb.createObjects(
        [
            timer_obj
        ]
    )
    if (res.failed_count != 0) {
        throw { "message": "创建定时同步任务失败" }
    }
    var wf_id = res.objects[0]
    return wf_id
}


function paramCheck(id, name, source_pkg_id, dest_pkg_id, interval_time, field_map, sync_type) {
    if (!id || !name || !source_pkg_id || !dest_pkg_id || !interval_time || !field_map || !sync_type) {
        throw { "message": "请填必填项目" }
    }
    if (source_pkg_id === dest_pkg_id) {
        throw { "message": "源数据模板id 与 目标数据模板 不能相同" }
    }
    if (interval_time < 30) {
        throw { "message": "同步间隔必须大于30s" }
    }
}

function main() {
    var id = input.id // 数据自维护id,
    var name = input.name // 数据自维护名称
    var source_pkg_id = input.source_pkg_id
    var dest_pkg_id = input.dest_pkg_id
    var interval_time = input.interval_time
    var field_map = input.field_map
    var sync_type = input.sync_type
    paramCheck(id, name, source_pkg_id, dest_pkg_id, interval_time, field_map, sync_type)
    // 检查同步id 是否一致
    var res = ctx.ecu.cmdb.queryObjects(
        {
            "conditions": [
                {
                    "field": ".inode.schema_id",
                    "op": "=",
                    "value": "cmdb_schema_x-10ciglth11xvq"
                },
                {
                    "field": ".indexes.cmdb_index-1vswnpvg373pv",
                    "op": "=",
                    "value": id
                }
            ],
            "objects": ["$conditions"],
            "selects": ["."]
        }
    )
    output["res"] = res
    if (res.total_count != 0) {
        throw { "message": "任务id不能相同" }
    }

    // 检查是否会有环形同步
    var res = ctx.ecu.cmdb.queryObjects(
        {
            "conditions": [
                {
                    "field": "inode.schema_id",
                    "op": "=",
                    "value": "cmdb_schema_x-10ciglth11xvq"
                },
                {
                    "field": "data.source_pkg_id",
                    "op": "=",
                    "value": dest_pkg_id
                },
                {
                    "field": "data.dest_pkg_id",
                    "op": "=",
                    "value": source_pkg_id
                }
            ],
            "objests": ["$conditions"],
            "selects": ["."]
        }
    )
    if (res.total_count != 0) {
        throw { "message": "可能出现了同步环,请检查" }
    }

    var wf_id = generateSyncScript(id, name, source_pkg_id, dest_pkg_id, field_map, sync_type)
    var timer_wf_id = generateTimerScript(name, wf_id, interval_time)
    // 启动定时器
    var res = ctx.ecu.workflow.createWorkflowJob(
        timer_wf_id,
        "normal"
    )

    var wf_job = res.id

    var obj =
        [
            {
                "inode": {
                    "schema_id": "cmdb_schema_x-10ciglth11xvq",
                    "name": name
                },
                "data": {
                    "source_pkg_id": source_pkg_id,
                    "dest_pkg_id": dest_pkg_id,
                    "interval_time": interval_time,
                    "sync_type": sync_type,
                    "field_map": JSON.stringify(field_map)
                },
                "indexes": {
                    "cmdb_index-1vswnpvg373pv": id,
                    "cmdb_index-wf": timer_wf_id,
                    "cmdb_index-ry962jcuu1ux": wf_id,
                    "cmdb_index-2k76c8mz52s9v": wf_job
                }
            }

        ]
    ctx.ecu.cmdb.createObjects(obj)
}

try {
    main()
} catch (e) {
    output.result = "FAILED",
        output.result_name = "创建同步失败",
        output.message = e.message
}

ctx.output(output) 
