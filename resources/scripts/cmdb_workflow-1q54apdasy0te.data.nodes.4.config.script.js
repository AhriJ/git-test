// WorkflowRuntimeContext 类型对象暴露 workflow 运行时方法
var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据
// ctx.output({xxxx}) 输出

function queryRaws(ids) {
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
    return (res.rows || []).map(function (i) {
        return i.data[1];
    });
}

input.excludeSchemaId.forEach(function (item) {
    var raw = queryRaws([item]);
    if (!raw[0]) {
        return;
    }
    ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput(
        "cmdb_workflow-132c557miiun9",
        {
            describe: raw[0].data.describe,
            group: raw[0].data.group,
            icon: raw[0].data.icon,
            id: raw[0].inode.id,
            menu_visible: raw[0].data.menu_visible,
            name: raw[0].data.name,
            required: null
        },
        "normal"
    )
})
ctx.output({})