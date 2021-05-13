
var ctx = new WorkflowRuntimeContext();
var input = ctx.input();
var configId = "cmdb_x-s_68ffce9f"
var schemaId = "cmdb_schema_x-1d1rbamd0vh7y";

function queryIndexes(ids) {
    var res = ctx.ecu.ql.queryQlTable({
        "conditions": [
            {
                "field": ".inode.id",
                "op": "=-",
                "value": ids
            }
        ],
        "objects": ids,
        "selects": ["."]
    });
    return (res.rows || []).map(function (i) { return i.data[1]; });
}
function check(obj, key) {
    return checkValue(obj[key]);
}
function checkValue(obj) {
    return obj !== null && obj !== undefined && obj !== "";
}
function verifyValue(data, schema, required, isUpdate) {
    if (required && !checkValue(data)) {
        throw Error(schema.title + "必须填写");
    }
    if (!checkValue(data)) {
        return;
    }
    switch (schema.type) {
        case "string":
            if (!(typeof data === "string")) {
                throw Error(schema.title + "类型不是字符串");
            }
            if (schema.pattern) {
                var reg = new RegExp(schema.pattern);
                if (!reg.test(data)) {
                    throw Error(schema.title + "无法通过正则校验: " + schema.pattern);
                }
            }
            break;
        case "number":
        case "integer":
            if (!(typeof data === "number")) {
                throw Error(schema.title + "类型不是数字");
            }
            if (check(schema, "minimum")) {
                if (schema.minimum > data) {
                    throw Error(schema.title + "小于最小值: " + schema.minimum);
                }
            }
            if (check(schema, "maximum")) {
                if (schema.maximum < data) {
                    throw Error(schema.title + "大于最大值: " + schema.maximum);
                }
            }
            break;
        case "boolean":
            if (!(typeof data === "boolean")) {
                throw Error(schema.title + "类型不是布尔");
            }
        case "array":
            if (data.length == 0 && required) {
                throw Error(schema.title + "必须填写");
            }
            for (var i = 0; i < data.length; i++) {
                var value = data[i];
                verifyValue(value, schema.items, true, isUpdate)
            }
        case "object":
            for (var key in schema.properties) {
                var s = schema.properties[key];
                var v = data[key];
                var required = (schema.required || []).indexOf(key) !== -1;
                verifyValue(v, s, required, isUpdate)
            }
    }
}
function verify(schemaId, data, isUpdate) {
    var result = ctx.ecu.cmdb.querySchemas({
        "conditions": [
            {
                "field": ".inode.id",
                "op": "=",
                "value": schemaId
            }
        ],
        "objects": [
            schemaId
        ],
        "selects": [".data"],
        "apply_schema_plugin": true
    });
    if(result.schemas.length == 0) {
       throw Error("内部错误，无法查询到该模型的 schema 信息（querySchemas return length = 0)");
    }
    var schema = result.schemas[0].data;
    if(!schema) {
       schema = {indexes: [], data: null} 
    }
    if (!schema.data) {
        schema.data = {
            "type": "object",
            "properties": {},
        }
    }
    var indexSchemaMap = {};
    if (schema.indexes && schema.indexes.length) {
        var indexIds = schema.indexes.map(function (i) {
            return i.id;
        });
        var indexSchemaMap = (queryIndexes(indexIds) || []).reduce(function (map, current) {
            map[current.inode.id] = current;
            return map;
        }, {});
    }
    var indexes = {
        "type": "object",
        "properties": {
        },
        "required": []
    };
    var schemas = {
        "type": "object",
        "properties": {
            "inode": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "title": "名称"
                    },
                    "descr": {
                        "type": "string",
                        "title": "描述"
                    }
                },
                "required": ["name"]
            },
            "data": schema.data,
            "indexes": indexes
        },
        "required": ["inode"]
    }
    var ii = schema.indexes || [];
    for (var i = 0; i < ii.length; i++) {
        var index = ii[i];
        var s = indexSchemaMap[index.id];
        var ss = {
            type: s.data.type.substring(0, 5) !== "cmdb_" ? s.data.type : "string",
        }
        if (s.data.schema) {
            ss.pattern = s.data.schema.pattern;
            ss.minimum = s.data.schema.minimum;
            ss.maximum = s.data.schema.maximum;
        }
        if (s.data.multi) {
            ss = {
                type: "array",
                items: ss
            }
        }
        ss.title = s.inode.name;
        indexes.properties[index.id] = ss;
        if (index.required) {
            indexes.required.push(index.id);
        }
    }
    verifyValue(data, schemas, false, isUpdate)
}



function transformData(data) {
    var target = {
        inode: {},
        indexes: {},
        data: {}
    };
    for (var key in data) {
        var value = data[key];
        if(!value) {
            value = ""
        }
        if (key.substring(0, 1) === ".") {
            key = key.substring(1);
        }
        var keys = key.split(".");
        if (keys.length == 2) {
            var type = keys[0];
            var k = keys[1];
            switch(type) {
                case "inode":
                    target.inode[k] = value;
                    break;
                case "data":
                    target.data[k] = value;
                    break;
                case "indexes":
                    target.indexes[k] = value;
                    break;
            }
        }
    }
    return target;
}



function main() {
    var data = transformData(input);
    data.inode.schema_id = schemaId;
    // check schema
    verify(schemaId, data, false);
    var result = ctx.ecu.cmdb.createObjects([data]);
    if (result.failed_count > 0) {
        return {
            "result": "FAILED",
            "result_name": "创建失败",
            "message": "创建失败"
        };
    } else {
        return {
            "result": "SUCCEEDED",
            "result_name": "创建成功",
            "message": "创建成功",
            "output": result
        };
    }
}
try {
    var output = main();
    ctx.output(output);
}
catch (e) {
    ctx.output({
        "result": "FAILED",
        "result_name": "发生异常",
        "message": e.message
    });
}
