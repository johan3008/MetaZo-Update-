const backupData = [{id: 1, name: 'a'}];
const existingBackups = [{items: [{id: 1, name: 'a'}]}];
console.log(JSON.stringify(backupData) === JSON.stringify(existingBackups[0].items));
