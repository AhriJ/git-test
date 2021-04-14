// date: 2020-11-02
// author: dengxiangyu
// describe: 归档同步任务


var ctx = new WorkflowRuntimeContext()
var input = ctx.input() // 获取input数据

var cancel_list= []
var output = {
    "result": "SUCCEEDED",
    "result_name": "终止成功",
    "message": "终止成功"
}

function cancelWf(cancel_list) {
    var res = ctx.ecu.workflow.cancelWorkflowJobs(cancel_list)
    output["res"] = res
}

function main() {
    var ids = input.ids
    var res = ctx.ecu.ql.queryQlTable({ "objects": ids, "selects": ["."] })
    res.rows.forEach(function (element) {
        var obj = element["data"][1]
        var task_id = obj.indexes["cmdb_index-2k76c8mz52s9v"]
        cancel_list.push(task_id)
    })
    cancelWf(cancel_list) 
}

try {
    main()
} catch (e) {
    output.result = "FAILED";
    output.result_name = "终止失败";
    output.message = e.message
}

ctx.output(output)
