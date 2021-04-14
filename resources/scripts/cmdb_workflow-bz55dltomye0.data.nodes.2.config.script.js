// 更新「工单模板」对象

// 输入规格：
// {
//     "target_template": "",
//     "ticket_template": {
//         "ticket_name": "",
//         "ticket_descr": "",
//         "logo_link": "",
//         "ticket_type": "", // *创建后不可修改
//         "input_schema": "<JSON_SCHEMA>",
//         "vars_schema": "<JSON_SCHEMA>", // 全局变量 Schema
//         "steps": [
//             {
//                 "name": "",
//                 "component_id": "",
//                 "config": {}, // 对应「工单组件」的 config_schema
//                 "input": {}, // 对应 Describe「工单组件」出来的 input_schema
//                 "fail_policy": "continue/stop/manual",
//                 "success_policy": "continue/manual",
//                 "premise": [
//                     {
//                         "var": "变量",
//                         "op": "=/!=/=-/!-/=~/!~/>/>=/</<=",
//                         "val": <变量或常量>,
//                     }
//                 ],
//                 "set_vars": [
//                     {
//                         "var_path": "",
//                         "var_value": "",
//                     }
//                 ], // 可引用当前节点的输出、输入值
//                 "handler_config": {
//                     "executor": <boolean>,
//                     "other_users": [<user_id>,...],
//                 },
//                 "notify_config": {
//                     "executor": <boolean>,
//                     "other_users": [<user_id>,...],
//                 }
//             },
//         ]
//     }
// }

// 输出规格：
// {
//     "result": "SUCCEEDED/FAILED",
//     "result_name": "操作成功",
//     "message": "message",
// }

var ctx = new WorkflowRuntimeContext();
var input = ctx.input();
var ecu = ctx.ecu;

var output = {
    "result": "",
    "result_name": "",
    "message": "",
    "output": {},
    "debug": {},
};

var ticketTemplateSchema = "cmdb_schema_x-xvbpbt1vit95"
var ticketComponentSchema = "cmdb_schema_x-13wfmv1w1c0om"
var ticketInstanceSchema = "cmdb_schema_x-16gddn9zkbt5z"
var ticketStepInstanceSchema = "cmdb_schema_x-1npbqzvnj45gz"
var ticketComponentLogSchema = "cmdb_schema_x-2v6829ff8z123"

var ticketTypeIndex = "cmdb_index-1c8wfs912y3h0"
var ticketTemplateIndex = "cmdb_index-m5rn0qhfaw4c"
var ticketStatusIndex = "cmdb_index-bu4nsnqtx6os"
var ticketStepStatusIndex = "cmdb_index-2enmd4pisoayc"
var ticketStepResultIndex = "cmdb_index-2pshjc1k53sbp"
var ticketTemplateSuIndex = "cmdb_index-secret-0"

var policyNextStep = "NEXT_STEP"
var policyAbortFlow = "ABORT_FLOW"

var statusPENDING = "PENDING" // for ticket and step
var statusPROCESSING = "PROCESSING" // for ticket and step
var statusFINISHED = "FINISHED" // for ticket and step
var statusWAITING = "WAITING" // for ticket and step
var statusCANCELED = "CANCELED" // for ticket and step
var statusCLOSED = "CLOSED" // for ticket

var resultSUCCEEDED = "SUCCEEDED" // for step
var resultFAILED = "FAILED" // for step
var resultUNKNOWN = "UNKNOWN" // for step

var componentDescriberWorkflow = "cmdb_workflow-35ogbrd89tvlu"

function componentDescriber(id, config, input) {
    var wfInput = {
        component_id: id,
        component_config: config,
        component_input: input
    }
    var wfReturn = {}
    try {
        wfReturn = ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput(
            componentDescriberWorkflow,
            wfInput
        )
    } catch (e) {
        return { ok: false, message: "获取组件格式异常：" + e.message }
    }
    if (wfReturn.aborted) {
        return { ok: false, message: "获取组件格式，被中断执行：" + wf_return.runtime_error }
    }
    var output = wfReturn.output || {}
    if (output.result !== "SUCCEEDED") {
        return { ok: false, message: output.message }
    }
    return { ok: true, schema: output.output }
}

function check(obj, key) {
    return checkValue(obj[key]);
}
function checkValue(obj) {
    var check = obj !== null && obj !== undefined;
    if (check && typeof obj === "string" && obj === "") {
        return false;
    }
    return check;
}

// 判断一个值是否是变量，如果是，则返回 JsonPath 路径
// 返回值：
// {
//     is_var: true/false
//     var_path: "ctx.a.b.c.d"
// }
// NOTE: 变量格式：$(ctx.a.b.c.d)
function parseVariableValue(val, prefix) {
    if (!prefix) {
        prefix = ""
    }
    if (typeof val != "string") {
        return { is_var: false }
    }
    if (val.length <= 3 + prefix.length) { // for len of "$(prefix)"
        return { is_var: false }
    }
    if (!val.match(/^\$\(.+\)$/g)) {
        return { is_var: false }
    }
    return { is_var: true, var_path: val.slice(2 + prefix.length, val.length - 1) }
}


function verifyValue(data, schema, required, k) {
    var title = schema.title || k
    // 如果为变量渲染直接通过
    if (checkValue(data) && typeof data === "string") {
        var vv = parseVariableValue(data, "ctx")
        if (vv.is_var) {
            return {};
        }
    }
    if (required && !checkValue(data)) {
        return { err: title + ": 必须填写" };
    }
    if (!checkValue(data)) {
        return {};
    }
    switch (schema.type) {
        case "string":
            if (!(typeof data === "string")) {
                return { err: title + ": 类型不是字符串" };
            }
            if (schema.pattern) {
                var reg = new RegExp(schema.pattern);
                if (!reg.test(data)) {
                    return { err: title + ": 无法通过正则校验 " + schema.pattern };
                }
            }
            break;
        case "number":
        case "integer":
            if (!(typeof data === "number")) {
                return { err: title + ": 类型不是数字" };
            }
            if (check(schema, "minimum")) {
                if (schema.minimum > data) {
                    return { err: title + ": 小于最小值 " + schema.minimum };
                }
            }
            if (check(schema, "maximum")) {
                if (schema.maximum < data) {
                    return { err: title + ": 大于最大值 " + schema.maximum };
                }
            }
            break;
        case "boolean":
            if (!(typeof data === "boolean")) {
                return { err: schema.title + ": 类型不是布尔" };
            }
            break;
        case "array":
            if (!Array.isArray(data)) {
                return { err: schema.title + ": 类型不是数组" };
            }
            var lens = data.length;
            if (required && lens === 0) {
                return { err: schema.title + ": 至少得有 1 个选项" };
            }
            if (check(schema, "minItems")) {
                if (schema.minItems > lens) {
                    return { err: schema.title + ": 至少得有 " + schema.minItems + " 个项" };
                }
            }
            for (var i = 0; i < lens; i++) {
                var value = data[i];
                var subKey = "[" + i + "]"
                var ret = verifyValue(value, schema.items, true, k ? k + subKey : subKey)
                if (ret.err) {
                    return ret
                }
            }
            break;
        case "object":
            if (!(typeof data === "object")) {
                return { err: schema.title + ": 类型不是对象" };
            }
            if (schema.properties) {
                for (var key in schema.properties) {
                    var s = schema.properties[key];
                    var v = data[key];
                    var required = (schema.required || []).indexOf(key) !== -1;
                    var subKey = key
                    var ret = verifyValue(v, s, required, k ? k + "." + subKey : subKey)
                    if (ret.err) {
                        return ret
                    }
                }
            }
            break;
    }
    return {}
}

function validateTicketSteps(steps) {
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        var ret = componentDescriber(step.component_id, step.config, step.input)
        if (!ret.ok) {
            return { ok: false, message: "步骤" + step.name + " " + ret.message }
        }
        var configSchema = ret.schema.config_schema;
        var inputSchema = ret.schema.input_schema;
        if (configSchema && configSchema.type) {
            var check = verifyValue(step.config, configSchema, true);
            if (check.err) {
                return { ok: false, message: "步骤" + step.name + "配置校验未通过 - " + check.err }
            }
        }
        if (inputSchema && inputSchema.type) {
            var check = verifyValue(step.input, inputSchema, true);
            if (check.err) {
                return { ok: false, message: "步骤" + step.name + "输入校验未通过 - " + check.err }
            }
        }
    }
    return { ok: true }
}

// 返回值：
// {
//     "ok": true/false,
//     "message": "",
// }
function validateTicketTemplateConfig(template_config) {
    if (!template_config.ticket_name) {
        return { ok: false, message: "请提供工单模板的名称（不能为空）" }
    }
    if (!template_config.ticket_type) {
        return { ok: false, message: "请提供工单模板的分类（不能为空）" }
    }
    if (!template_config.steps || !template_config.steps.length) {
        return { ok: false, message: "工单模板需至少由一个流转步骤构成" }
    }
    if (!template_config.input_schema) {
        template_config.input_schema = "{\"type\":\"object\"}"
    }
    if (!template_config.vars_schema) {
        template_config.vars_schema = "{\"type\":\"object\"}"
    }
    bad_schema = false
    try { JSON.parse(template_config.input_schema) } catch (e) {
        bad_schema = true
    }
    if (bad_schema) {
        return { ok: false, message: "输入规格的定义格式不正确，请检查" }
    }
    bad_schema = false
    try { JSON.parse(template_config.vars_schema) } catch (e) {
        bad_schema = true
    }
    if (bad_schema) {
        return { ok: false, message: "变量规格的定义格式不正确，请检查" }
    }
    // 校验每个步骤的 config 和 inut
    var ret = validateTicketSteps(template_config.steps);
    if (!ret.ok) {
        return ret
    }

    // TODO: 校验每个流转步骤中的变量引用是否正确
    // 变量格式：$(ctx.xxxxx)
    return { ok: true }
}

// 返回值：
// {
//      "ok": true/false,
//      "message": "",
// }
function updateTicketTemplate(target_template, template_config) {
    if (!target_template) {
        return { ok: false, message: "未指定更新的目标工单模板配置" }
    }
    var ticketTemplateObject = {
        inode: {
            name: template_config.ticket_name,
            schema_id: ticketTemplateSchema,
            descr: template_config.ticket_descr,
        },
        data: {
            vars_schema: template_config.vars_schema,
            input_schema: template_config.input_schema,
            notify_config: template_config.notify_config,
            handler_config: template_config.handler_config,
            su: template_config.su,
            steps: template_config.steps,
            logo_link: template_config.logo_link
        },
        indexes: {
            "cmdb_index-1c8wfs912y3h0": template_config.ticket_type,
            "cmdb_index-3uhsq5xww0cy8": template_config.model_id
        },
    }
    var configs = [];
    var mm = {};
    template_config.steps.forEach(function(step) {
        var id = null;
        switch (step.component_id) {
            case "cmdb_x-3gy1a11mobps5":
            case "cmdb_x-j7zjt6166ej2":
                // job
                id = step.config.script_template_id;
                break;
            case "cmdb_x-1kim7r7722y2p":
                // workflow
                id = step.config.workflow_id;
                break;
            case "cmdb_x-35bpsbeixkdik":
                // ticket
                id = step.config.ticket_template_id;
                break;
            case "cmdb_x-27iuasmn1uy8q":
                // resource class
                id = step.config.resource_class_id;
                break;
            case "cmdb_x-3q3152p27b609":
                // resource template
                id = step.config.resource_template_id;
                break;

        }
        if (id && !mm[id]) {
            mm[id] = true;
            configs.push(id);
        }
    })
    ticketTemplateObject.indexes["cmdb_index-22sud7kvtxe7x"] = configs;
    var updateQuery = {
        objects: [target_template],
        conditions: [
            {
                field: "inode.schema_id",
                op: "=",
                value: ticketTemplateSchema
            }
        ],
    }
    update_result = {}
    try {
        update_result = ecu.cmdb.updateObjects(updateQuery, {
            object: ticketTemplateObject,
            updates: [
                ".indexes.cmdb_index-1c8wfs912y3h0",
                ".data.steps",
                ".data.su",
                ".data.handler_config",
                ".data.notify_config",
                ".data.input_schema",
                ".data.vars_schema",
                ".data.logo_link",
                ".inode.name",
                ".inode.descr",
                ".indexes.cmdb_index-3uhsq5xww0cy8",
                ".indexes.cmdb_index-22sud7kvtxe7x"
            ],
        });
    } catch (e) {
        return { ok: false, message: "操作异常，请稍后重试：" + e.message }
    }
    if (!update_result.update_count) {
        return { ok: false, message: "没有此操作的权限，请联系管理员" }
    }
    return { ok: true }
}

var generataWorkflowId = "cmdb_workflow-20qb8gxx9ztpt"

function generataWorkflow(ticket_template) {
    var wFinput = {
        target_template: ticket_template
    }
    var wfReturn = {}
    try {
        wfReturn = ecu.workflow.startAndWaitWorkflowJobFirstOutput(
            generataWorkflowId,
            wFinput
        )
    } catch (e) {
        return { ok: false, message: "生成执行异常：" + e.message }
    }
    if (wfReturn.aborted) {
        return { ok: false, message: "生成执行异常，被中断执行：" + wf_return.runtime_error }
    }
    var out = wfReturn.output || {};
    if (out.result !== "SUCCEEDED") {
        return { ok: false, message: "生成执行异常：" + out.message }
    }
    return { ok: true }
}

// 返回值：
// {
//      "ok": true/false,
//      "message": "",
//      "ticket_template_id": ""
// }
function createNewTicketTemplate(config) {
    ticketTemplateObject = {
        inode: {
            name: config.ticket_name,
            schema_id: ticketTemplateSchema,
            descr: config.ticket_descr,
        },
        data: {
            logo_link: config.logo_link
        },
        indexes: {
            "cmdb_index-3uhsq5xww0cy8": config.model_id,
            "cmdb_index-1c8wfs912y3h0": config.ticket_type,
        },
    }
    create_result = {}
    try {
        create_result = ecu.cmdb.createObjects([ticketTemplateObject]);
    } catch (e) {
        return {ok: false, message: "无法完成指定的操作："+e.message}
    }
    if (!create_result.objects || !create_result.objects.length) {
        return {ok: false, message: "无法完成指定的操作（或没有此操作的权限）"}
    }
    return {ok: true, ticket_template_id: create_result.objects[0]}
}

function mainProcessFunction() {
    var isCreate = false;
    var validate_ret = validateTicketTemplateConfig(input.ticket_template);
    if (!validate_ret.ok) {
        output.result = "FAILED"
        output.result_name = "配置参数错误"
        output.message = validate_ret.message
        return
    }
    // 兼容创建
    if (!input.target_template) {
       var createRet = createNewTicketTemplate(input.ticket_template);
       if (!createRet.ok) {
            output.result = "FAILED"
            output.result_name = "创建失败"
            output.message = createRet.message
            return
       }
       isCreate = true
       input.target_template = createRet.ticket_template_id
    }
    var update_ret = updateTicketTemplate(input.target_template, input.ticket_template);
    if (!update_ret.ok) {
        output.result = "FAILED"
        output.result_name = "配置更新失败"
        output.message = update_ret.message
        return
    }
    var generateRet = generataWorkflow(input.target_template);
    if (!generateRet.ok) {
        output.result = "FAILED"
        output.result_name = "工单生成失败"
        output.message = generateRet.message
        return
    }
    output.result = "SUCCEEDED"

    output.result_name = isCreate ? "配置创建成功" : "配置更新成功"
    output.message = isCreate ? "配置创建成功，请前往工单模板库查看" : "配置更新成功，请前往工单模板列表查看"
    if (isCreate) {
        output.output["ticket_template_id"] = input.target_template
    }
}

try {
    mainProcessFunction();
} catch (e) {
    output.result = "FAILED"
    output.result_name = "配置更新失败"
    output.message = "操作异常，请稍后重试：" + e.message
}
ctx.output(output);