// date: 2020-11-02
// author: dengxiangyu
// describe: 启动同步任务


var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据

var output = {
    "result": "SUCCEEDED",
    "result_name": "启动成功",
    "message": "启动成功"
}




function main() {
    var ids = input.ids
    var res = ctx.ecu.ql.queryQlTable({ "objects": ids, "selects": ["."] })
    res.rows.forEach(function (element) {
        var obj = element.data[1]
        var timer_wf_id = obj.indexes["cmdb_index-wf"]
        var inode_id = obj.inode.id
        var res = ctx.ecu.workflow.createWorkflowJob(
            timer_wf_id,
            "normal"
        )
        var wf_job_id = res.id
        ctx.ecu.cmdb.updateObjects(
            { "objects": [inode_id] },
            {
                "object": {
                    "indexes": {
                        "cmdb_index-2k76c8mz52s9v": wf_job_id
                    }
                },
                "updates": ["indexes.cmdb_index-2k76c8mz52s9v"]
            }
        )
    })
}

try {
    main()
} catch (e) {
    output.result = "FAILED";
    output.result_name = "启动失败";
    output.message = e.message
}

ctx.output(output)
