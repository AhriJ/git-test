/**
 * @author linjianhui
 * @modify dengxiangyu
 * @description 转换旧数据到CMDB
 */

 var ctx = new WorkflowRuntimeContext();
 var input = ctx.input();
 var errIds = [];
 
 
 input.excludeSchemaId = input.excludeSchemaId || []
 
 var indexConfigSchema = "cmdb_schema_x-2bbnpb7xawvdc";
 var indexConfigTypeIndex = "cmdb_index-1m8g2lnhu7s0u";
 var indexConfigArrayIndex = "cmdb_index-24s4gq55rc6q2";
 var indexConfigPkgIndex = "cmdb_index-2juvlwf06k1a1";
 
 var schemaConfigSchema = "cmdb_schema_x-schema";
 var schemaConfigSchemaIndex = "cmdb_index-1llredm1yz8zm";
 
 
 var pkgSchema = "cmdb_schema_x-ghkfn72ezw6k";
 var pkgToConfigIndex = "cmdb_index-5idpkmb7eqne";
 
 var fieldSchema = "cmdb_schema_x-2cc07zkxuurwn";
 var fieldToConfigIndex = "cmdb_index-36ylwj69mshlq";
 var fieldToParentIndex = "cmdb_index-3vtvm6lmltynj";
 var fieldToLinkConfigIndex = "cmdb_index-1rpqm2p9dxpuq";
 
 var cmdbReadOnlyIndex = "cmdb_index-3b01as46nc0b7";
 
 var schemaSchema = "cmdb_schema_schema_x-0";
 var indexSchema = "cmdb_schema_index-0"
 
 var qlSchema = "cmdb_schema_ql-0";
 
 var ids = [];
 var indexesIds = [];
 var schemaConfigIds = [];
 
 var isReadOnly = !input.without_readonly;
 var importMap = {};
 
 var output = {
   schema: 0,
   index: 0
 }
 
 
 var ret = {
   "result": "SUCCEEDED",
   "result_name": "转换成功",
   "message": "转换成功"
 }
 
 
 
 
 /**
  * JS Implementation of MurmurHash2
  *
  * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
  * @see http://github.com/garycourt/murmurhash-js
  * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
  * @see http://sites.google.com/site/murmurhash/
  *
  * @param {string} str ASCII only
  * @param {number} seed Positive integer only
  * @return {number} 32-bit positive integer hash
  */
 function murmurhash2_32_gc(str, seed) {
   var
     l = str.length,
     h = seed ^ l,
     i = 0,
     k;
 
   while (l >= 4) {
     k =
       ((str.charCodeAt(i) & 0xff)) |
       ((str.charCodeAt(++i) & 0xff) << 8) |
       ((str.charCodeAt(++i) & 0xff) << 16) |
       ((str.charCodeAt(++i) & 0xff) << 24);
 
     k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
     k ^= k >>> 24;
     k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
 
     h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;
 
     l -= 4;
     ++i;
   }
 
   switch (l) {
     case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
     case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
     case 1: h ^= (str.charCodeAt(i) & 0xff);
       h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
   }
 
   h ^= h >>> 13;
   h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
   h ^= h >>> 15;
 
   return h >>> 0;
 }
 
 function murmurhash(str) {
   return murmurhash2_32_gc(str, 0).toString(16)
 }
 
 
 function updateObject(id, object, updates) {
   var result = ctx.ecu.cmdb.updateObjects({
     objects: [id]
   }, {
     object: object,
     updates: updates
   })
   if (result.update_count > 0 && result.failed_count === 0) {
     return result;
   }
   else {
     throw Error("更新对象失败");
   }
 }
 
 function createObject(object) {
   var result = ctx.ecu.cmdb.createObjects([object]);
   if (result.create_count > 0 && result.failed_count === 0) {
     return result;
   }
   else {
     throw Error("创建对象失败");
   }
 }
 
 function updateOrCreate(id, object, updates) {
   if (id) {
     var res = updateObject(id, object, updates);
     object.inode.id = id;
     return res;
   } else {
     var res = createObject(object);
     object.inode.id = res.objects[0];
     return res;
   }
 }
 
 function check(val) {
   return val !== undefined && val !== null;
 }
 
 function checkArray(val) {
   return check(val) && Array.isArray(val);
 }
 
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
 
 function archiveObjects(ids) {
   ctx.ecu.cmdb.updateObjects({
     "objects": ids
   }, {
     "object": {
       "inode": {
         "archived": true
       }
     },
     "updates": [".inode.archived"]
   });
 }
 
 function queryRaw(id) {
   var res = ctx.ecu.ql.queryQlTable({
     "conditions": [
       {
         "field": ".inode.id",
         "op": "=",
         "value": id
       }
     ],
     "objects": [id],
     "selects": ["."]
   });
   if (res && res.rows && res.rows.length) {
     return res.rows[0].data[1]
   }
   return null
 }
 
 function indexToIndexConfig(index) {
   // check
   var res = ctx.ecu.ql.queryQlTable({
     "conditions": [
       {
         "field": ".inode.schema_id",
         "op": "=",
         "value": indexConfigSchema
       },
       {
         "field": ".data.index_id",
         "op": "=",
         "value": index.inode.id,
       },
       {
         "field": ".indexes.cmdb_index-1m8g2lnhu7s0u",
         "op": "!-",
         "value": input.excludeSchemaId
       }
     ],
     "objects": [
       "$conditions"
     ],
     "selects": ["."]
   });
   var isUpdate = !!res.rows.length;
   var generateId = "cmdb_x-i_" + murmurhash(String(index.inode.id));
   var indexId = null;
   var indexConfig = {
     data: {
       index_id: index.inode.id
     },
     indexes: {},
     inode: {
       name: index.inode.name,
       descr: index.inode.descr,
       schema_id: indexConfigSchema,
       id: generateId
     }
   };
   if (isUpdate) {
     var config = null;
     config = res.rows[0].data[1];
     indexId = config.inode.id;
     indexConfig.indexes[cmdbReadOnlyIndex] = config.indexes[cmdbReadOnlyIndex];
     if (importMap[indexId] || !indexConfig.indexes[cmdbReadOnlyIndex]) {
       return config;
     } else {
       importMap[indexId] = true;
     }
   }
 
   var updates = [
     ".inode.name",
     ".inode.descr",
     ".data",
     ".indexes." + indexConfigPkgIndex,
     ".indexes." + indexConfigTypeIndex,
     ".indexes." + indexConfigArrayIndex
   ];
   // 创建或者为原只读
   if (!isUpdate || indexConfig.indexes[cmdbReadOnlyIndex]) {
     indexConfig.indexes[cmdbReadOnlyIndex] = isReadOnly;
     updates.push(".indexes." + cmdbReadOnlyIndex)
   }
 
   if (!index.data.type) {
     throw Error("索引字段类型不存在: " + index.inode.id);
   }
 
   indexConfig.indexes[indexConfigTypeIndex] = index.data.type;
   indexConfig.indexes[indexConfigArrayIndex] = !!index.data.multi;
   if (index.data.schema) {
     indexConfig.data.schema = index.data.schema;
     delete indexConfig.data.schema.type;
     if (checkArray(indexConfig.data.schema.enum)) {
       indexConfig.data.schema.enum = indexConfig.data.schema.enum.join("\n")
     }
   }
   updateOrCreate(indexId, indexConfig, updates);
   indexId = indexConfig.inode.id;
   if (index.data.type.substring(0, 5) === "cmdb_") {
     var schema = queryRaw(index.data.type);
     if (!schema) {
       return null;
       // throw Error("关联的模型已被删除: " + index.data.type);
     }
     var schemaConfig = schemaToSchemaConfig(schema);
     indexConfig.indexes[indexConfigPkgIndex] = schemaConfig.data.pkg_id;
     indexConfig.indexes[indexConfigTypeIndex] = schemaConfig.inode.id;
   }
   updateOrCreate(indexId, indexConfig, [
     ".indexes." + indexConfigPkgIndex,
     ".indexes." + indexConfigTypeIndex
   ]);
   ids.push(indexId);
   output.index++;
   return indexConfig;
 }
 
 function dataFields(schema, configId, parentId, parentKey) {
   if (schema.type !== "object") {
     return [];
   }
   var options = [];
   var required = schema.required || [];
   loop:
   for (var key in schema.properties) {
     var item = schema.properties[key];
     if (!item.type) {
       if (item["$ref"]) {
         // 忽略 $ref 的高级字段
         continue;
       }
       throw Error("字段类型不存在: " + configId);
     }
     var fullKey = parentKey ? parentKey + "." + key : key;
     var name = item.title || fullKey;
     var isArray = item.type === "array";
     var arrayDepth = 0;
     while (isArray) {
       item = item.items;
       if (!item || !item.type) {
         if (item && item["$ref"]) {
           // 忽略 $ref 的高级字段
           continue loop;
         }
         throw Error("数组字段类型不存在: " + configId + "-" + fullKey);
       }
       arrayDepth++;
       if (item.type !== "array") {
         break;
       }
     }
     var field = {
       inode: {
         schema_id: fieldSchema,
         name: name
       },
       data: {
         field_id: key,
         field_name: name,
         field_type: item.type,
         is_array: isArray,
         searched: false,
         required: required.indexOf(key) !== -1
       },
       indexes: {}
     }
     if (isArray) {
       field.data.array_depth = arrayDepth;
     }
 
     field.indexes[fieldToConfigIndex] = configId;
     field.indexes[fieldToParentIndex] = parentId;
     field.indexes[cmdbReadOnlyIndex] = true;
     switch (item.type) {
       case "number":
       case "integer":
         field.data.number_option = {};
         check(item.minimum) && (field.data.number_option.minimum = item.minimum);
         check(item.maximum) && (field.data.number_option.maximum = item.maximum);
         check(item.default) && (field.data.number_option.default = item.default);
         field.data.number_option.format = item.format ? item.format : ""
         break;
       case "text":
       case "string":
         field.data.string_option = {};
         check(item.pattern) && (field.data.string_option.pattern = item.pattern);
         checkArray(item.enum) && (field.data.string_option.enum = item.enum.join("\n"));
         check(item.default) !== null && (field.data.string_option.default = item.default);
         field.data.string_option.format = item.format ? item.format : ""
         break;
       case "boolean":
         field.data.boolean_option = {};
         check(item.default) && (field.data.boolean_option.default = item.default);
         field.data.boolean_option.format = item.format ? item.format : ""
         break;
     }
     var result = ctx.ecu.cmdb.createObjects([field]);
     checkCreateResult(result, "创建字段失败")
     var fieldId = result.objects[0];
     options.push({
       inode_id: fieldId,
     });
     if (item.type === "object") {
       var objectOption = dataFields(item, configId, fieldId, fullKey);
       result = ctx.ecu.cmdb.updateObjects({
         "conditions": [
           {
             "field": ".inode.id",
             "op": "=",
             "value": fieldId
           }
         ],
         "objects": [
           fieldId
         ]
       }, {
         "object": {
           "data": {
             object_option: objectOption
           }
         },
         "updates": [".data.object_option"]
       });
       checkUpdateResult(result, "更新字段结构体")
     }
     ids.push(fieldId);
   }
   return options;
 }
 
 function indexFields(indexes, configId, custom_field_id_array) {
   var indexIds = indexes.map(function (i) {
     return i.id;
   }).filter(function (i) {
     return !!i;
   });
   var indexMap = queryRaws(indexIds).reduce(function (map, curr) {
     if (curr) {
       map[curr.inode.id] = curr;
     }
     return map;
   }, {});
   for (var i = 0; i < indexes.length; i++) {
     var index = indexes[i];
     var indexObject = indexMap[index.id];
     if (!indexObject) {
       // 索引被删除
       continue;
     }
     var indexConfig = indexToIndexConfig(indexObject);
     if (!indexConfig) {
       // 索引关联的模型被删除
       indexesIds.push(index.id);
       continue;
     }
     var key = index.key || "index_" + (i + 1);
     // 合并重复字段
     if (custom_field_id_array.indexOf(key) != -1) {
       continue
     }
     var type = indexObject.data.type;
     var isLink = type.substring(0, 5) === "cmdb_";
     if (isLink) {
       type = "id"
     }
     var field = {
       inode: {
         schema_id: fieldSchema,
         name: indexObject.inode.name
       },
       data: {
         field_id: key,
         field_name: indexObject.inode.name,
         field_type: type,
         is_array: !!indexObject.data.multi,
         searched: true,
         required: !!index.required,
         index_id: indexConfig.inode.id
       },
       indexes: {}
     }
     field.indexes[fieldToConfigIndex] = configId;
     field.indexes[cmdbReadOnlyIndex] = true;
     var item = indexObject.data.schema || {};
     switch (type) {
       case "number":
       case "integer":
         field.data.number_option = {};
         check(item.minimum) && (field.data.number_option.minimum = item.minimum);
         check(item.maximum) && (field.data.number_option.maximum = item.maximum);
         check(item.default) && (field.data.number_option.default = item.default);
         field.data.number_option.format = item.format ? item.format : ""
         break;
       case "text":
       case "string":
         field.data.string_option = {};
         check(item.pattern) && (field.data.string_option.pattern = item.pattern);
         checkArray(item.enum) && (field.data.string_option.enum = item.enum.join("\n"));
         check(item.default) !== null && (field.data.string_option.default = item.default);
         field.data.string_option.format = item.format ? item.format : ""
 
         break;
       case "boolean":
         field.data.boolean_option = {};
         check(item.default) && (field.data.boolean_option.default = item.default);
         field.data.boolean_option.format = item.format ? item.format : ""
 
         break;
       case "id":
         field.indexes[fieldToLinkConfigIndex] = indexConfig.indexes[indexConfigTypeIndex];
     }
     var result = ctx.ecu.cmdb.createObjects([field]);
     checkCreateResult(result, "创建索引字段失败");
     var fieldId = result.objects[0];
     ids.push(fieldId);
   }
 }
 
 function updatePkgPage(configId) {
   var result = ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput(
     "cmdb_workflow-2eqjxlzs3b7wx",
     {
       config_id: configId
     },
     "normal"
   )
 
   if (!result.output || result.output.result === "FAILED") {
     throw Error("生成对象操作工作流失败:" + configId);
   }
 
   result = ctx.ecu.workflow.startAndWaitWorkflowJobFirstOutput(
     "cmdb_workflow-21xj8i0x22wdz",
     {
       config_id: configId,
       skip_schema: true,
       skip_page: true
     },
     "normal"
   );
   if (!result.output || result.output.result === "FAILED") {
    errIds.push(configId);
    //  throw Error("生成默认数据模板页面失败:" + configId);
   }
 }
 
 function schemaToSchemaConfig(schema) {
   // check
   var schemaId = schema.inode.id;
   var res = ctx.ecu.ql.queryQlTable({
     "conditions": [
       {
         "field": ".inode.schema_id",
         "op": "=",
         "value": schemaConfigSchema
       },
       {
         "field": ".indexes." + schemaConfigSchemaIndex,
         "op": "=",
         "value": schemaId,
       }
     ],
     "objects": [
       "$conditions"
     ],
     "selects": ["."]
   });
 
   // 查找schema 是否有对应的模型配置
   var isUpdate = !!(res && res.rows && res.rows.length);
   ret["isUpdate"] = isUpdate
   var generateId = "cmdb_x-s_" + murmurhash(String(schemaId));
   var schemaConfig = {
     inode: {
       id: generateId,
       name: schema.inode.name,
       descr: schema.inode.descr,
       schema_id: schemaConfigSchema
     },
     data: {
       menu_visible: false,
       describe: schema.inode.descr,
       name: schema.inode.name,
       group: "系统"
     },
     indexes: {}
   }
 
   var configId;
   if (isUpdate) {
     var obj = res.rows[0].data[1];
     if (obj) {
       configId = obj.inode.id;
       schemaConfig.data.pkg_id = obj.data.pkg_id;
       schemaConfig.indexes[cmdbReadOnlyIndex] = obj.indexes[cmdbReadOnlyIndex];
       if (importMap[configId] || !schemaConfig.indexes[cmdbReadOnlyIndex]) {
         return obj;
       } else {
         importMap[configId] = true;
       }
     } else {
       isUpdate = false
     }
   }
   var id = schemaId.substring(12).split("-")[0];
   if (id === "x") {
     id = "";
   }
 
   schemaConfig.data.id = id;
   schemaConfig.indexes[schemaConfigSchemaIndex] = schemaId;
 
 
   var updates = [
     ".inode.name",
     ".inode.descr",
     ".data.describe",
     ".data.name"
   ];
 
   if (!isUpdate || schemaConfig.indexes[cmdbReadOnlyIndex]) {
     schemaConfig.indexes[cmdbReadOnlyIndex] = isReadOnly;
     updates.push(".indexes." + cmdbReadOnlyIndex)
   }
 
   updateOrCreate(configId, schemaConfig, updates)
   // var result = ctx.ecu.cmdb.createObjects([schemaConfig])
   // checkCreateResult(result, "创建模型配置失败")
   configId = schemaConfig.inode.id;
   ids.push(configId);
   if (!isUpdate) {
     // ql
     var qlCondition = {
       "conditions": [
         {
           "field": ".inode.schema_id",
           "op": "=",
           "value": schemaId
         }
       ],
       "function": "db",
       "selects": [
         ".inode.name",
         ".inode.mtime",
         ".inode.last_editor"
       ],
       "vars": {
         "type": "object",
         "properties": {
           "vars": {
             "type": "object",
             "properties": {}
           }
         }
       },
       "sorts": [],
       "objects": [
         "$conditions"
       ],
       "multi": true
     }
     var ql = {
       "data": {
         "content": JSON.stringify(qlCondition),
       },
       "inode": {
         name: schema.inode.name + "默认数据模板常用查询",
         schema_id: qlSchema
       }
     }
     var res = ctx.ecu.cmdb.createObjects([ql]);
     checkCreateResult(res, "创建常用查询失败");
     var qlId = res.objects[0];
     // pkg
     var pkg = {
       "conditions": [],
       "vars": [],
       "selects": [],
       "forms": [],
       "ql": qlId
     };
     var id_array = schemaId.split("_")
     var new_id_array = ["cmdb_x"]
     for (var i = 0; i < id_array.length; i++) {
       if (i > 1) {
         new_id_array.push(id_array[i])
       }
     }
     new_id_array.push("default")
     var id = new_id_array.join("_")
     var pkg = {
       "inode": {
         "schema_id": pkgSchema,
         "id": id,
         "name": schema.inode.name + "默认数据模板"
       },
       "data": pkg,
       "indexes": {}
     }
     pkg.indexes[pkgToConfigIndex] = configId;
     pkg.indexes[cmdbReadOnlyIndex] = isReadOnly;
     var res = ctx.ecu.cmdb.createObjects([pkg]);
     checkCreateResult(res, "创建数据模板失败")
     var pkgId = res.objects[0];
     ids.push(pkgId);
     schemaConfig.data.pkg_id = pkgId;
     res = ctx.ecu.cmdb.updateObjects({
       "conditions": [
         {
           "field": ".inode.id",
           "op": "=",
           "value": configId
         }
       ],
       "objects": [
         configId
       ]
     }, {
       "object": {
         "data": {
           pkg_id: pkgId
         }
       },
       "updates": [".data.pkg_id"]
     });
     checkUpdateResult(res, "更新数据模板到模型配置失败")
   } else {
     // 清理所有的内置字段后重建
     ctx.ecu.cmdb.updateObjects({
       conditions: [
         {
           field: ".inode.schema_id",
           op: "=",
           value: fieldSchema
         },
         {
           field: ".indexes." + fieldToConfigIndex,
           op: "=",
           value: configId
         },
         {
           field: "indexes.cmdb_index-3b01as46nc0b7",
           op: "=",
           value: true
         }
 
       ],
       objects: ["$conditions"]
     }, {
       object: {
         inode: {
           archived: true
         }
       },
       updates: [".inode.archived"]
     })
   }
 
 
   // 查询用户自定义字段，保留不动
   var res = ctx.ecu.cmdb.queryObjects({
     "conditions": [
       {
         field: ".inode.schema_id",
         op: "=",
         value: fieldSchema
       },
       {
         field: ".indexes." + fieldToConfigIndex,
         op: "=",
         value: configId
       },
       {
         field: "indexes.cmdb_index-3b01as46nc0b7",
         op: "=",
         value: "$null"
       },
       {
         "field": ".indexes.cmdb_index-3vtvm6lmltynj",
         "op": "=",
         "value": "$null"
       }
     ],
     "objects": ["$conditions"],
     "selects": ["."]
   })
   var custom_field_id_array = []
   if (res.objects.length > 0) {
     res.objects.forEach(function (element) {
       var field_id = element.data.field_id
       custom_field_id_array.push(field_id)
     });
 
     var data1 = JSON.parse(schema.data.data);
     if (JSON.stringify(data1.propertie) != "{}") {
       for (key in data1.properties) {
         if (custom_field_id_array.indexOf(key) != -1) {
           delete data1.properties[key]
         }
       }
       schema.data.data = JSON.stringify(data1)
     }
 
     var index1 = schema.data.indexes
     var tmp_index = []
     if (index1.length > 0) {
       for (var i = 0; i < index1.length; i++) {
         var element = index1[i]
         if (element.hasOwnProperty("key") && custom_field_id_array.indexOf(element["key"]) == -1) {
           tmp_index.push(element)
         } else if (!element.hasOwnProperty("key")) {
           tmp_index.push(element)
         }
       }
       schema.data.indexes = tmp_index
     }
   }
 
 
 
 
 
 
   // // fields data
   if (!!schema.data.data && schema.data.data != "null") {
     try {
       var data = JSON.parse(schema.data.data);
       dataFields(data, configId)
     } catch (e) {
       throw Error("解析json失败a:" + e.message + ";  异常schemaId:" + schemaId);
     }
   }
 
   // fields indexes
   if (schema.data.indexes && schema.data.indexes.length) {
     indexFields(schema.data.indexes, configId, custom_field_id_array);
   }
 
   // // 更新数据模板，创建页面
   // updatePkgPage(configId);
   schemaConfigIds.push(configId);
 
   output.schema++;
   return schemaConfig;
 }
 
 /**
  * @param {{create_count: number; failed_count: number;}} result
  * @param {string} message
  */
 function checkCreateResult(result, message) {
   if (result.create_count > 0 && result.failed_count === 0) {
     return;
   }
   else {
     throw Error(message);
   }
 }
 
 /**
  * @param {{update_count: number; failed_count: number;}} result
  * @param {string} message
  */
 function checkUpdateResult(result, message) {
   if (result.update_count > 0 && result.failed_count === 0) {
     return;
   }
   else {
     throw Error(message);
   }
 }
 
 function querySchema(offset, limit) {
   var ql = {
     "conditions": [
       {
         "field": ".inode.schema_id",
         "op": "=",
         "value": schemaSchema
       },
       {
         "field": "inode.id",
         "op": "!-",
         "value": {
           "conditions": [
             {
               "field": "inode.schema_id",
               "op": "=",
               "value": "cmdb_schema_x-schema"
             }
           ],
           "objects": input.excludeSchemaId,
           "selects": [
             ".indexes.cmdb_index-1llredm1yz8zm as ret"
           ]
         }
       }
     ],
     "objects": [
       "$conditions"
     ],
     "selects": ["."],
     "offset": offset,
     "limit": limit
   }
   // if (!!namespaces) {
   //     ql["conditions"].push(
   //         {
   //             "field": ".inode.namespace",
   //             "op": "=-",
   //             "value": namespaces
   //         }
   //     )
   // }
   output["ql"] = ql
   var res = ctx.ecu.ql.queryQlTable(ql)
   return (res.rows || []).map(function (i) {
     return i.data[1];
   });
 }
 
 function queryIndex(offset, limit) {
   var res = ctx.ecu.ql.queryQlTable({
     "conditions": [
       {
         "field": ".inode.schema_id",
         "op": "=",
         "value": indexSchema
       }
     ],
     "objects": [
       "$conditions"
     ],
     "selects": ["."],
     "offset": offset,
     "limit": limit
   });
   return (res.rows || []).map(function (i) {
     return i.data[1];
   });
 }
 
 function main() {
   var indexLimit = input.index_limit;
   if (indexLimit) {
 
   }
   var schemaIds = input.ids;
   var indexIds = input.index_ids;
   ret["schemaIds"] = schemaIds
   if (schemaIds && schemaIds.length) {
     for (var i = 0; i < schemaIds.length; i++) {
       var id = schemaIds[i];
       var schema = queryRaw(id);
       ret["origin_schema"] = schema
       if (!schema) {
         continue
       }
       schemaToSchemaConfig(schema);
     }
   }
   if (indexIds && indexIds.length) {
     for (var i = 0; i < indexIds.length; i++) {
       var id = indexIds[i];
       var index = queryRaw(id);
       indexToIndexConfig(index);
     }
   }
   var limit = input.limit;
   var namespaces = input.namespaces
   var offset = 0;
   if (limit) {
     while (true) {
       var schemas = querySchema(offset, limit);
       if (!schemas || schemas.length === 0) {
         break;
       }
       offset += limit;
       for (var i = 0; i < schemas.length; i++) {
         var s = schemas[i];
         if (s) {
           schemaToSchemaConfig(s);
         }
       }
     }
   }
   if (schemaConfigIds && schemaConfigIds.length) {
     for (var i = 0; i < schemaConfigIds.length; i++) {
       var configId = schemaConfigIds[i];
       updatePkgPage(configId);
     }
   }
 }
 try {
   main();
 } catch (e) {
   ret = {
     "result": "FAILED",
     "result_name": "发生异常",
     "message": e.message,
     "output": ids
   }
 }
 ret.errIds = errIds;
 ctx.output(ret)
 
