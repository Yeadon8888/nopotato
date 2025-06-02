// MongoDB初始化脚本
// 创建应用数据库和用户

// 切换到nopotato数据库
db = db.getSiblingDB('nopotato');

// 创建应用用户
db.createUser({
  user: 'nopotato_user',
  pwd: 'userpassword123',
  roles: [
    {
      role: 'readWrite',
      db: 'nopotato'
    }
  ]
});

// 创建基础集合
db.createCollection('users');
db.createCollection('tasks');
db.createCollection('pomodororecords');

// 创建索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.tasks.createIndex({ "user": 1 });
db.pomodororecords.createIndex({ "user": 1 });
db.pomodororecords.createIndex({ "createdAt": 1 });

print('MongoDB初始化完成！');
print('数据库: nopotato');
print('用户: nopotato_user');
print('集合: users, tasks, pomodororecords');
print('索引已创建完成');
