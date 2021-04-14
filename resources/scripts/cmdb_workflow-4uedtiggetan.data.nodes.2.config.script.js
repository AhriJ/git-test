
var ctx = new WorkflowRuntimeContext();
var input = ctx.input();
function main() {
    var createArr = []
    for (var i = 0; i < input.list.length; i++) {
        var object
        try {
            object = JSON.parse(input.list[i])
        }
        catch (e) {
            throw Error("输入格式错误")
        }

        res = ctx.ecu.cmdb.queryObjects({
            "objects": [
                object.inode.id
            ],
            "sorts": [],
            "limit": 1,
            "selects": [
                "."
            ],
            "comment": "",
            "function": "db",
            "vars": {}
        })
        if (res.total_count < 1) {
            createArr.push(object) 
        }
    }
    var result = ctx.ecu.cmdb.createObjects(createArr);

    if (result.failed_count > 0) {
        throw Error("创建失败")
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
