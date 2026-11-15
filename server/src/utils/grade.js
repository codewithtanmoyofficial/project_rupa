exports.gradeFor = (m) => (m >= 90 ? 'A+' : m >= 80 ? 'A' : m >= 70 ? 'B' : m >= 60 ? 'C' : m >= 40 ? 'D' : 'F');
exports.resultFor = (m) => (m >= 40 ? 'Pass' : 'Fail');
