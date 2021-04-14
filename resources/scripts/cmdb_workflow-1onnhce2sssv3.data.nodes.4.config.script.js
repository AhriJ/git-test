var ctx = new WorkflowRuntimeContext()
var input = ctx.input()


var level_indexes_id = "cmdb_index-3fsgbvko7e0pc"
var url_indexes_id = "cmdb_index-k1fvsgfi2zw1"
var type_indexes_id = "cmdb_index-1a6ad1dt6cl66"
var business_indexes_id = "cmdb_index-18gs5gfejka3i"
var business_tree_schema_id = "cmdb_schema_u_tree-0"
var parent_indexes_id = "cmdb_index-18gs5gfejka3i"
var alert_address = "https://opsmind.lilithgames.com/#/xray/alert/"
var webhook_schema_id = "cmdb_schema_u_webhook_manage-0"
var resource_schema_id = [
    // "cmdb_schema_u_crf_mongodb-0",
    // "cmdb_schema_u_crf_redis-0",
    // "cmdb_schema_u_crf_slb-0",
    // "cmdb_schema_u_crf_cloud_rds-0",
    "cmdb_schema_u_crf_server-0"
]

var output = {
    error: "", // 错误信息
    webhook: [ // 告警地址
    ],
    level: ""
}

// timestamp => 2020-06-01 11:00:00
function timestamp2str(ts) {
    if (ts == 0) {
        return ""
    }
    var date = new Date(ts * 1000)
    var y = date.getFullYear()
    var mon = date.getMonth() + 1
    var day = date.getDate()
    var hour = date.getHours()
    var min = date.getMinutes()
    var sec = date.getSeconds()
    return y + "-" + mon + "-" + day + " " + hour + ":" + min + ":" + sec
}


// 获取webhook 模型对象
function fetchWebhook() {
    var result
    var ret = ctx.ecu.cmdb.queryObjects(
        {
            "conditions": [
                {
                    "field": ".inode.schema_id",
                    "op": "=",
                    "value": webhook_schema_id
                }
            ],
            "objects": ["$conditions"],
            "selects": ["."]
        }
    )
    if (!!ret.objects) {
        result = ret.objects.map(function (object) {
            var map = {}
            var level = object.indexes[level_indexes_id]
            var type = object.indexes[type_indexes_id]
            var url = object.indexes[url_indexes_id]
            var business = !!object.indexes[business_indexes_id] ? object.indexes[business_indexes_id].inode.id : ""
            var name = object.inode.name
            map = {
                "name": name,
                "level": level,
                "type": type,
                "url": url,
                "business": business
            }
            return map
        })
    } else {
        throw { "message": "获取不到webhook信息" }
    }
    return result ? result : []
}

function genBusinessWebhookMap(webhook_objects) {
    var map = {}
    if (webhook_objects.length != 0) {
        webhook_objects.forEach(function (element) {
            var level = element.level
            var url = element.url
            var business = element.business
            var type = element.type
            if (!!map[business] && !!map[business][level] && !!map[business][level][type]) {
                map[business][level][type]["url"].push(url)
            } else if (!!map[business] && !!map[business][level] && !map[business][level][type]) {
                map[business][level] = { type: { "url": [url] } }
            } else if (!!map[business] && !map[business][level]) {
                var tmp1 = {}
                var tmp2 = {}
                tmp1[type] = { "url": [url] }
                map[business][level] = tmp1
            }
            else {
                var tmp1 = {}
                var tmp2 = {}
                tmp1[type] = { "url": [url] }
                tmp2[level] = tmp1
                map[business] = tmp2
            }
        })
    }
    return map
}


function genNameWebhookMap(webhook_objects) {
    var map = {}
    if (webhook_objects.length != 0) {
        webhook_objects.forEach(function (element) {
            var level = element.level
            var name = element.name
            var url = element.url
            var type = element.type
            var business = element.business
            if (!!map[name] && !!map[name][level] && !!map[name][level][type]) {
                map[name][level][type]["url"].push(url)
            } else if (!!map[name] && !!map[name][level] && !map[name][level][type]) {
                map[name][level][type] = { "url": [url], "business": business }
            } else if (!!map[name] && !map[name][level]) {

                var tmp1 = {}
                var tmp2 = {}
                tmp1 = { "url": [url], "business": business }
                tmp2[type] = tmp1
                map[name][level] = tmp2
            } else {
                var tmp = {}
                var tmp2 = {}
                var tmp3 = {}
                tmp = { "url": [url], "business": business }
                tmp2[type] = tmp
                tmp3[level] = tmp2
                map[name] = tmp3

            }
        })
    }
    return map
}

function genBusinessMap() {
    var ret = ctx.ecu.cmdb.queryObjects(
        {
            "conditions": [
                {
                    "field": "inode.schema_id",
                    "op": "=",
                    "value": business_tree_schema_id
                }
            ],
            "objects": ["$conditions"],
            "selects": ["."]
        }
    )
    var map = ret.objects.reduce(function (map, element) {
        var node_id = element.inode_id
        var parent_id = element.indexes[parent_indexes_id]
        map = { "node": node_id, "parent": parent_id }
        return map
    }, {})
    return map
}

function findTree(business_webhook_map, business_map, business, level) {
    if (!!business_webhook_map[business] && !!business_webhook_map[business][level]) {
        return business_webhook_map[business][level]
    }
    if (!business_map["parent"]) {
        return {}
    } else {
        var business = business_map["parent"]
        return findTree(business, level)
    }
}


function genWebhook(url, content) {
    if (!!url) {
        var result = url.map(function (webhook) {
            var a = webhook.split("/")
            var b = []
            var c = []
            var host
            var path
            a.forEach(function (element, index) {
                if (index == 0 || index == 2) {
                    b.push(element)
                }

                if (index > 2) {
                    c.push(element)
                }
            })
            host = b.join("//")
            path = "/" + c.join("/")
            return { "host": host, "path": path, "content": content }
        })
    } else {
        throw { "message": "未找到改告警对应的webhook地址" }
    }
    return result
}
/**
 * 根据 om.native.v2 协议的告警回调内容，生成默认的「企业微信告警通知」（markdown）
 */
function genWechatMessage(input) {
    // 接警地址拼接
    var val = (input.value).toFixed(2)
    var notify_times = input.notify_times + 1
    var active = input.active
    var start_time = input.start
    var end_time = input.end
    var tags = input.tags
    var alert_id = input["alert_id"]
    var alert_url = "[告警地址(链接)](" + alert_address + alert_id + ")"
    var level_msg
    var status = ""
    var title = input.title
    var cs = []
    var notes = input.notes

    // 1. 处理no data 情况
    if (!!tags.nodata && tags.nodata == "True") {
        var level = input.policy.level
        if (!!active) {
            title = '<font color="warning">' + '[告警]：' + ' - ' + title + '</font>'
            level_msg = '<font color="warning">' + level + '</font>'
            var startT = timestamp2str(start_time)
            cs.push(title)
            cs.push("- 告警级别：**" + level_msg + "**")
            cs.push("- 告警内容：" + "no data")
            cs.push("- 告警次数：" + notify_times)
            cs.push("- 告警产生时间：<font color=\"comment\">" + startT + "</font>")
        } else {
            title = '<font color="info">' + '[告警恢复]：' + ' - ' + title + '</font>'
            level_msg = '<font color="info">' + level + '</font>'
            var startT = timestamp2str(start_time)
            var endT = timestamp2str(end_time)
            cs.push(title)
            cs.push("- 告警级别：**" + level_msg + "**")
            cs.push("- 告警内容：" + "no data")
            cs.push("- 告警次数：" + notify_times)
            cs.push("- 告警产生时间：<font color=\"comment\">" + startT + "</font>")
            cs.push("- 告警恢复时间：<font color=\"comment\">" + endT + "</font>")
        }
        cs.push("- 接警地址：" + alert_url)
        cs = cs.join("\n")
        content = {
            "msgtype": "markdown",
            "markdown": {
                "content": cs
            }
        }
        return content
    }

    // 2. 处理 tag 信息
    var level = input.trigger.level
    if (level !== '') {
        output.level = level
    } else {
        output.level = "warn"
    }
    var metric = input.metric.display_name
    var operator = input.root_trig.operator
    var desc = input.trigger.desc
    var threshold = input.trigger.threshold
    var notes = input.notes
    if (desc == "") {
        desc = "无"
    }
    var tags_array = []
    var tagstr = ""
    for (var k in tags) {
        var v = input.tags[k]
        v = '> - [' + k + ']: ' + v
        tags_array.push(v)
    }

    tagstr = tags_array.join("\n")
    if (tagstr == "") {
        tagstr = '>  <font color="comment">无</font>'
    }

    // 3. 处理状态title信息
    if (!!active) {
        title = '<font color="warning">' + '[告警]：' + title + '</font>'
        level_msg = '<font color="warning">' + level + '</font>'
        if (notify_times > 0) {
            status = '<font color="warning">' + "[" + level + "] 告警仍在持续" + '</font>'
        } else {
            status = '<font color="warning">' + "[" + level + "] 新告警产生" + '</font>'
        }
    } else {
        title = '<font color="info">' + '[告警恢复]：' + title + '</font>'
        level_msg = '<font color="info">' + level + '</font>'
        status = '<font color="info">' + "[" + level + "] 告警恢复" + '</font>'
    }


    // 4. 处理备注信息
    var notes_array = []
    var notestr = ""
    for (var k in notes) {
        var v = notes[k]
        v = '<font color="comment">[' + k + ']: ' + v + '</font>'
        notes_array.push(v)
    }
    notestr = notes_array.join("\n")
    if (notestr == "") {
        notestr = '<font color="comment">无</font>'
    }

    // 5. 处理开始/结束、阈值等信息
    var startT = timestamp2str(start_time)
    var endT = timestamp2str(end_time)


    // 6. 进行整体的拼装
    cs.push("#### " + title)
    cs.push("- 告警对象：")
    cs.push(tagstr)
    cs.push("")
    cs.push("- 告警级别：**" + level + "**")
    cs.push("- 告警指标：" + metric)
    cs.push("- 告警状态：" + status)
    cs.push("- 告警产生时间：<font color=\"comment\">" + startT + "</font>")
    if (!!active) {
        cs.push("- 告警次数：" + notify_times)
    }

    if (!active) {
        cs.push("- 告警恢复时间：<font color=\"comment\">" + endT + "</font>")
    }
    cs.push("- 告警阈值：<font color=\"comment\">" + operator + " " + threshold + "</font>")

    if (active) {
        cs.push("- 告警当前值：<font color=\"warning\">" + val + "</font>")
    }

    cs.push("- 接警地址：" + alert_url)
    cs.push("- 告警备注：" + notestr)
    cs.push("")

    cs.push("- 告警描述：")
    cs.push(">  <font color=\"comment\">" + desc + "</font>")
    cs = cs.join("\n")
    var content = {
        "msgtype": "markdown",
        "markdown": {
            "content": cs
        }
    }
    return content
}


function genSlackMessage(input) {
    var val = (input.value).toFixed(2)
    var notify_times = input.notify_times + 1
    var active = input.active
    var start_time = input.start
    var end_time = input.end
    var tags = input.tags
    var desc = !!input.trigger.desc ? input.trigger.desc : "无"
    var metric = input.metric.display_name
    var alert_id = input["alert_id"]
    var alert_url = alert_address + alert_id
    var status = !!active ? "触发告警" : "告警恢复"
    var title = input.title
    var thresh = input.trigger.threshold
    var level = !!input.trigger.level ? input.trigger.level : input.policy.level
    var startT = timestamp2str(start_time)
    var endT = timestamp2str(end_time)
    var cs = []
    // 处理 no data 告警
    if (!!tags.nodata && tags.nodata == "True") {
        if (!!active) {
            title = '[告警]：' + title
            var color = "#ff4d4f"
            cs.push(title)
            cs.push("- 告警级别：**" + level + "**")
            cs.push("- 告警内容：" + "no data")
            cs.push("- 告警次数：" + notify_times)
            cs.push("- 告警产生时间：" + startT)
        } else {
            title = '[告警恢复]：' + title
            var color = "#2eb886"
            cs.push(title)
            cs.push("- 告警级别：**" + level + "**")
            cs.push("- 告警内容：" + "no data")
            cs.push("- 告警次数：" + notify_times)
            cs.push("- 告警产生时间：" + startT)
            cs.push("- 告警恢复时间：" + endT)
        }
        cs.push("- 接警地址：" + alert_url)
        cs = cs.join("\n")
        var content = {
            "attachments": [
                {
                    "color": color,
                    "title_link": alert_url,
                    "title": title,
                    "text": cs.join("\n"),
                }
            ]
        }
        return content
    }

    var operator = input.root_trig.operator
    // 1. 处理 tag 信息
    var tags_array = []
    var tagstr = ""
    for (var k in tags) {
        var v = tags[k]
        v = '>[' + k + ']: ' + v
        tags_array.push(v)
    }
    tagstr = tags_array.join("\n")
    if (tagstr == "") {
        tagstr = '>  无'
    }

    // 2. 处理状态/title信息
    var color = "#ff4d4f"
    if (!!active) {
        title = "[告警]：" + "-" + title
    } else {
        title = "[告警恢复]：" + "-" + title
        color = "#2eb886"
    }

    // 3. 处理备注信息
    var notes = []
    var notestr = ""
    for (var k in notes) {
        var v = notes[k]
        v = '>[' + k + ']: ' + v
        notes.push(v)
    }
    notestr = notes.join("\n")
    if (notestr == "") {
        notestr = '> 无'
    }

    // 5. 进行整体的拼装
    var cs = []
    cs.push("- 告警对象：")
    cs.push(tagstr)
    cs.push("")
    cs.push("- 告警级别：" + level)
    cs.push("- 告警指标：" + metric)
    cs.push("- 告警状态：" + status)
    cs.push("- 告警产生时间：" + startT)
    if (!input.active) {
        cs.push("- 告警恢复时间：" + endT)
    }
    if (!!input.active) {
        cs.push("- 告警次数：" + notify_times)
    }

    cs.push("- 告警阈值：" + operator + " " + thresh)

    if (input.active) {
        cs.push("- 告警当前值：" + val)
    }

    cs.push("- 接警地址：" + alert_url)
    cs.push("- 告警备注：")
    cs.push("- 告警描述：")
    cs.push("> " + desc)
    var content = {
        "attachments": [
            {
                "color": color,
                "title_link": alert_url,
                "title": title,
                "text": cs.join("\n"),
            }
        ]
    }
    return content
}

function main() {
    var url
    var content // 告警内容
    var alert_item // 告警方式和告警地址
    var level = !!input.policy.level ? input.policy.level : input.trigger.level
    var instance_id = (input.tags.instanceId || input.tags.InstanceId)
    output.level = level
    output["instance_id"] = instance_id
    output["level"] = level

    // 1. 获取webhook 中数据
    var webhook_objects = fetchWebhook()
    var name_webhook_map = genNameWebhookMap(webhook_objects)
    var business_webhook_map = genBusinessWebhookMap(webhook_objects)
    output["webhook_objects"] = webhook_objects
    output["name_webhook_map"] = name_webhook_map
    output["business_webhook_map"] = business_webhook_map


    // 2. 获取一个默认的告警方式和告警的url
    if (!!name_webhook_map["default"] && !!name_webhook_map["default"][level]) {
        alert_item = name_webhook_map["default"][level]
    } else if (!!name_webhook_map["default"]) {
        throw { "message": "未找到对应级别的默认webhook条目" }
    } else {
        throw { "message": "未找到默认webhook条目" }
    }
    output["alert_item"] = alert_item
    // 3. 如果告警的notes中的extra_tag有值
    if (!!input.notes && !!input.notes.extra_tag) {
        var extra_tag = input.notes.extra_tag
        output["extra_tag"] = extra_tag
        if (!!name_webhook_map[extra_tag] && !!name_webhook_map[extra_tag][level]) {
            alert_item = name_webhook_map[extra_tag][level]
        } else {
            alert_item = name_webhook_map["default"][level]
        }
    }
    else {
        // 4. 获取告警信息中是否有instanceId, 
        try {
            if (!!instance_id) {
                var ret = ctx.ecu.cmdb.queryObjects({
                    "conditions": [
                        {
                            "field": ".indexes.cmdb_index-external_id", // 关联业务树
                            "op": "=",
                            "value": instance_id
                        },
                        {
                            "field": ".inode.schema_id",
                            "op": "=-",
                            "value": resource_schema_id
                        }
                    ],
                    "objects": ["$conditions"],
                    "selects": [".indexes.cmdb_index-external_id"]
                })
                output["instance_ret"] = ret
                if (ret.total_count == 1) {
                    var inode_id = ret.objects[0].inode.id
                    var ret = ctx.ecu.cmdb.queryObjects({
                        "conditions": [
                            {
                                "field": ".inode.id", // 关联业务树
                                "op": "=",
                                "value": inode_id
                            },
                            {
                                "field": ".inode.schema_id",
                                "op": "=-",
                                "value": resource_schema_id
                            }
                        ],
                        "objects": ["$conditions"],
                        "selects": ["."]
                    })
                    output["inode_id"] = inode_id
                    output["inode_ret"] = ret
                    try {
                        tree_node_id = !!ret.objects[0]["indexes"][business_indexes_id] ? ret.objects[0]["indexes"][business_indexes_id].inode.id : ""
                        if (!tree_node_id) {
                            throw { "message": "该资源未找到对应业务树节点" }
                        }
                        // tree_node_id = "cmdb_u_tree-3svtgawo0n94t"
                        output["tree_node_id"] = tree_node_id
                        var business_map = genBusinessMap()
                        output["business_map"] = business_map
                        node = findTree(business_webhook_map, business_map, tree_node_id, level)
                        output["business_node"] = node
                        if (!!node) {
                            alert_item = node
                        }
                    } catch (e) {
                        output.error = "未找到资源关联的业务节点"
                    }
                }
            }
        } catch (e) {
            output.error = e.message
        }
    }

    // 5.生成对应告警方式内容和地址的列表
    output["alert_item2"] = alert_item
    for (var item in alert_item) {
        var webhook 
        switch (item) {
            case "wechat":
                var wechat_content = genWechatMessage(input)
                var url = alert_item[item]["url"]
                output["wechat_content"] = wechat_content
                webhook = genWebhook(url, wechat_content)
                break
                // output.webhook.push(webhook)
            case "slack":
                var slack_content = genSlackMessage(input)
                var url = alert_item[item]["url"]
                output["slack_content"] = slack_content
                webhook = genWebhook(url, slack_content)
                break
                // output.webhook.push(webhook)
            default:
                var wechat_content = genWechatMessage(input)
                var url = alert_item[item]["url"]
                webhook = genWebhook(url, wechat_content)
                // output.webhook.push(webhook)

        }
        output.webhook.push(webhook)

    }
}


try {
    main()
} catch (e) {
    output.error = e.message
}
ctx.output(output)