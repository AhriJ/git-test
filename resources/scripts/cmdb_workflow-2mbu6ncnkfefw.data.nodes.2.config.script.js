
var ctx = new WorkflowRuntimeContext();
var input = ctx.input();
function main() {
    var createArr = []
    for (var i = 0; i < input.list.length; i++) {
        var object
        try {
            object = JSON.parse(input.list[i])
            if (object.inode && object.inode.id) {
                var raw = queryRaw(object.inode.id);
                object = merge(raw, object);
            }
        }
        catch (e) {
            throw Error("输入格式错误")
        }

        createArr[i] = object;
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

/**
 * 合并两个对象
 * @param {object} obj1 
 * @param {obejct} obj2 
 */
function merge(obj1, obj2) {
  if (!obj1) return obj2;

  if (obj2.inode) {
    for (var i in obj2.inode) {
      obj1.inode[i] = obj2.inode[i];
    }
  }

  if (obj2.data) {
    for (var i in obj2.data) {
      obj1.data[i] = obj2.data[i];
    }
  }
  
  if (obj2.indexes) {
    for (var i in obj2.indexes) {
      obj1.indexes[i] = obj2.indexes[i];
    }
  }

  return obj1;
}

function queryRaw(id) {
    var res = ctx.ecu.ql.queryQlTable(
      {
        objects: [id],
        selects: ["."]
      }
    );
  
    if (res && res.rows && res.rows.length) {
      return res.rows[0].data[1];
    }
    return null;
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
