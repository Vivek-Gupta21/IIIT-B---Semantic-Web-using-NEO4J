var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver').v1;

var app = express();

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', express.static('assets'))


var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'vsui738#'));
var session = driver.session();

app.get('/', function(req, res){
					res.render('index');
});

app.get('/students',function(req,res){
	session
	.run('MATCH(n:ns0__Student) RETURN n')
		.then(function(result){
			var studArr = [];
			result.records.forEach(function(record){
				studArr.push({
					id: record._fields[0].properties.ns0__student_id,
					name: record._fields[0].properties.ns0__full_name,
					gender: record._fields[0].properties.ns0__Gender,
					cgpa: record._fields[0].properties.ns0__CGPA
				});
			});
			res.render('students',{students: studArr,});
		})
		.catch(function(err) {
			console.log(err);
		});
});

app.get('/courses',function(req,res){
	session
		.run('MATCH (n:ns0__Subjects) RETURN n')
			.then(function(result2){
				var SubjectArr = [];
				result2.records.forEach(function(record){
					SubjectArr.push({
							Subject_Name: record._fields[0].properties.ns0__Subject_Name,
							Subject_Credit: record._fields[0].properties.ns0__Subject_Credits
						});
					});
					res.render('courses', {
						Subjects: SubjectArr
					});
				})
			.catch(function(err){
				console.log(err);
			});
});


app.get('/faculty',function(req,res){
	session
		.run('MATCH (n:ns0__Faculty) RETURN n')
			.then(function(result3){
				var faculty_Arr = [];
				result3.records.forEach(function(record){
					faculty_Arr.push({
						id: record._fields[0].properties.ns0__Faculty_Id,
						name: record._fields[0].properties.ns0__full_name,
						gender: record._fields[0].properties.ns0__Gender,
					});
				});
				res.render('faculty', {
					Faculty: faculty_Arr
				});
		})
	.catch(function(err){
		console.log(err);
	});
});

app.get('/inverse',function(req,res){
	session
		.run('MATCH p=(a:ns0__Faculty)-[r:ns0__teaches]->(b:ns0__Subjects) RETURN a,b')
		.then(function(result){
			session
				.run('MATCH (a:ns0__Subjects)-[r:ns0__IsTaughtBy]->(b:ns0__Faculty) RETURN a,b')
				.then(function(result2){
					var taught = [];
					result2.records.forEach(function(record){
						taught.push({
							sub_name: record._fields[0].properties.ns0__Subject_Name,
							fac_name: record._fields[1].properties.ns0__full_name,
						});
					});
				
					var teach = [];
					result.records.forEach(function(record){
						teach.push({
							fac_name: record._fields[0].properties.ns0__full_name,
							sub_name: record._fields[1].properties.ns0__Subject_Name,
						});
					});
					res.render('inverse', {
						teacher : teach,
						taught_by : taught
					});
					session.close();
					})
					.catch(function(err)
						{console.log(err);
					});
				})
				.catch(function(err)
					{console.log(err);
				});
});


app.get('/symmetric',function(req,res){
	session
		.run('MATCH (a:ns0__Student)-[r:ns0__Is_Classmate]->(b:ns0__Student) RETURN a,b')
		.then(function(result){
			var stud1Arr = [];
			var stud2Arr = [];
			result.records.forEach(function(record){
				stud1Arr.push({
					name: record._fields[0].properties.ns0__full_name
				});
				stud2Arr.push({
					name: record._fields[1].properties.ns0__full_name
				});
			});
			
			res.render('symmetric', {
				studentA: stud1Arr,
				studentB: stud2Arr
			});

		})
		.catch(function(err){
			console.log(err);
		});
});

app.get('/transitive',function(req,res){
	session
		.run('MATCH (a:ns0__Student)-[ns0__HasTaken]->(b:ns0__Subjects)-[ns0__IsTaughtBy]->(c:ns0__Faculty)  RETURN a,b,c')
		.then(function(result4){
			var Trans = [];

			result4.records.forEach(function(record){
				Trans.push({
					stuName: record._fields[0].properties.ns0__full_name,
					subName: record._fields[1].properties.ns0__Subject_Name,
					facName: record._fields[2].properties.ns0__full_name
				});
			});

			res.render('transitive', {
				Trans: Trans
			});
		})
		.catch(function(err){
			console.log(err);
		});
});


app.post('/student/add', function(req, res){
	var roll_no = req.body.roll_no;
	var name = req.body.stu_name;
	var gender = req.body.stu_gender;
	var cgpa = req.body.cgpa;

	session

		.run('CREATE(n:ns0__Student {ns0__student_id:{rollNoParam},ns0__full_name:{nameParam},ns0__Gender:{genderParam},ns0__CGPA:{cgpaParam}}) RETURN n.ns0__student_id', {rollNoParam:roll_no, nameParam:name, genderParam:gender, cgpaParam:cgpa})
		.then(function(result){
			res.redirect('/students'); 

			session.close();
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/students');
});

app.post('/subject/add', function(req, res){
	var SubjectName = req.body.Subject_Name;
	var Credits = req.body.Subject_Credit;

	session
		.run('CREATE(n:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam},ns0__Subject_Credits:{CreditsParam}}) RETURN n.ns0__Subjects', {SubjectNameParam:SubjectName, CreditsParam:Credits})
		.then(function(result){
			res.redirect('/courses'); 

			session.close();
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/courses');
});


app.get('/functional',function(req,res){
	session
		.run('MATCH (a:ns0__Student)-[r:ns0__enrolled]->(b:ns0__Programmes) RETURN a,b')
		.then(function(result1){
					var enrolled= [];
					result1.records.forEach(function(record){
						enrolled.push({
							stu_name: record._fields[0].properties.ns0__full_name,
							course_name: record._fields[1].properties.ns0__courseName
						});
					});

					res.render('functional',{
						Enrolled: enrolled
					});
				})
			.catch(function(err){
				console.log(err);
			});
});


app.post('/subject/taughtby/add', function(req, res){
	var SubjectName = req.body.Subject_name;
	var name = req.body.fac_name;

	session
		.run('Match(b:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam}}),(a:ns0__Faculty {ns0__full_name:{facultyNameParam}}) MERGE(b)-[r:ns0__IsTaughtBy]->(a) RETURN b,a',{facultyNameParam:name,SubjectNameParam:SubjectName})
		.then(function(result){
			session
				.run('Match(a:ns0__Faculty {ns0__full_name:{facultyNameParam}}),(b:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam}}) MERGE(a)-[r:ns0__teaches]->(b) RETURN a,b', {facultyNameParam:name,SubjectNameParam:SubjectName})
				.then(function(result1){
					session
						.run('MATCH (m:ns0__Student )-[r:ns0__HasTaken]->(n:ns0__Subjects) WHERE (m)-[r]->(n{ns0__Subject_Name:{SubjectNameParam}})RETURN m', {SubjectNameParam:SubjectName})
						.then(function(result2){
							var studArr = [];
							result2.records.forEach(function(record){
								studArr.push({
									name: record._fields[0].properties.ns0__full_name,
									
								});
							});

							var student;
							studArr.forEach(function(students){
								student = students.name;
								session
									.run('Match(x:ns0__Student {ns0__full_name:{nameParam}}),(y:ns0__Faculty {ns0__full_name:{facultyNameParam}}) MERGE (x)-[r:ns0__IsStudentOf]->(y) RETURN x,y', {nameParam:student,facultyNameParam:name})
									.then(function(result4){
										res.redirect('/courses'); 
										session.close();
									})
									.catch(function(err){
										console.log(err);
									})
								});
						})
						.catch(function(err){
							console.log(err);
						})

					session.close();
					res.redirect('/courses'); 
					

				})
				.catch(function(err){
					console.log(err);
				})

			res.redirect('/courses'); 
			
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/courses');
});







app.post('/faculty/add', function(req,res){
	var id = req.body.fac_id;
	var name = req.body.fac_name;
	var gender = req.body.fac_gender;

	session
		.run('CREATE (a:ns0__Faculty{ns0__Faculty_Id:{facidParam},ns0__full_name:{facnameParam},ns0__Gender: {facgenderParam}}) RETURN a.ns0__full_name', {facidParam:id, facnameParam:name, facgenderParam:gender})
		.then(function(result){
			res.redirect('/faculty');

			session.close();
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/faculty');
});


app.post('/student/enrolled/add', function(req,res){
	var stu_name = req.body.stu_name;
	var programme = req.body.course_name;

	session
		.run('MATCH (a:ns0__Student{ns0__full_name:{stunameParam}}),(b:ns0__Programmes{ns0__courseName:{programmeParam}}) MERGE(a)-[r:ns0__enrolled]->(b) RETURN a.ns0__full_name', {stunameParam:stu_name, programmeParam:programme})
		.then(function(result){
			res.redirect('/students');
			session.close();
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/faculty');
});






app.post('/student/takenby/add', function(req, res){
	var name = req.body.stu_name;
	var SubjectName = req.body.Subject_Name;
	var studArr = [];

	session
		.run('MATCH (n:ns0__Student)-[r:ns0__HasTaken]->(m:ns0__Subjects ) WHERE (n)-[r]->(m{ns0__Subject_Name:{SubjectNameParam}}) RETURN n', {SubjectNameParam:SubjectName})
		.then(function(result2){
			
			result2.records.forEach(function(record){
				studArr.push({
						name: record._fields[0].properties.ns0__full_name,
						
					});
			});
		})
		.catch(function(err){
			console.log(err);
		});


	session
		.run('Match(a:ns0__Student {ns0__full_name:{nameParam}}),(b:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam}}) MERGE(a)-[r:ns0__HasTaken]->(b) RETURN a,b', {nameParam:name,SubjectNameParam:SubjectName})
		.then(function(result){
			
			studArr.forEach(function(record){
				session
					.run('Match(a:ns0__Student {ns0__full_name:{nameParam1}}),(b:ns0__Student {ns0__full_name:{nameParam2}}) MERGE(a)-[r:ns0__Is_Classmate]->(b) RETURN a,b', {nameParam1:name,nameParam2:record.name})
					.then(function(result1){
						session
							.run('Match(a:ns0__Student {ns0__full_name:{nameParam1}}),(b:ns0__Student {ns0__full_name:{nameParam2}}) MERGE(b)-[r:ns0__Is_Classmate]->(a) RETURN b,a', {nameParam1:name,nameParam2:record.name})
							.then(function(result2){
								res.redirect('/'); 
								session.close();
							})
							.catch(function(err){
								console.log(err);
							});

					})
					.catch(function(err){
						console.log(err);
					});

			});
			
			session
				.run('MATCH (n:ns0__Subjects)-[r:ns0__IsTaughtBy]->(m:ns0__Faculty ) WHERE (n{ns0__Subject_Name:{SubjectNameParam}})-[r]->(m)RETURN m', {SubjectNameParam:SubjectName})
				.then(function(result1){
						
					if(result1!=null){
						var facultyArr = [];
						result1.records.forEach(function(record){
							facultyArr.push({
								name: record._fields[0].properties.ns0__full_name,
									
							});
						});
						var faculty;
						facultyArr.forEach(function(faculties){
							faculty = faculties.name;
						});
						
						session
							.run('Match(x:ns0__Student {ns0__full_name:{nameParam}}),(y:ns0__Faculty {ns0__full_name:{facultyNameParam}}) MERGE (x)-[r:ns0__IsStudentOf]->(y) RETURN x,y', {nameParam:name,facultyNameParam:faculty})
							.then(function(result2){
									
								res.redirect('/'); 
								session.close();
							})
							.catch(function(err){
								console.log(err);
							});

					}
					res.redirect('/'); 
					session.close();

				})
				.catch(function(err){
					console.log(err);
				});

		res.redirect('/'); 
		session.close();

		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/');
});


app.post('/faculty/teaches/add', function(req, res){
	var name = req.body.fac_name;
	var SubjectName = req.body.Subject_Name;

	session
		.run('Match(a:ns0__Faculty {ns0__full_name:{facultyNameParam}}),(b:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam}}) MERGE(a)-[r:ns0__teaches]->(b) RETURN a,b', {facultyNameParam:name,SubjectNameParam:SubjectName})
		.then(function(result){
			session
				.run('Match(b:ns0__Subjects {ns0__Subject_Name:{SubjectNameParam}}),(a:ns0__Faculty {ns0__full_name:{facultyNameParam}}) MERGE(b)-[r:ns0__IsTaughtBy]->(a) RETURN b,a',{facultyNameParam:name,SubjectNameParam:SubjectName})
				.then(function(result1){
					session
						.run('MATCH (m:ns0__Student )-[r:ns0__HasTaken]->(n:ns0__Subjects) WHERE (m)-[r]->(n{ns0__Subject_Name:{SubjectNameParam}}) RETURN m', {SubjectNameParam:SubjectName})
						.then(function(result2){
							var studArr = [];
							result2.records.forEach(function(record){
								studArr.push({
									name: record._fields[0].properties.ns0__full_name,
									
								});
							});

							var student;
							studArr.forEach(function(students){
								student = students.name;
								session
									.run('Match(x:ns0__Student {ns0__full_name:{nameParam}}),(y:ns0__Faculty {ns0__full_name:{facultyNameParam}}) MERGE (x)-[r:ns0__IsStudentOf]->(y) RETURN x,y', {nameParam:student,facultyNameParam:name})
									.then(function(result4){
										res.redirect('/'); 
										session.close();
									})
									.catch(function(err){
										console.log(err);
									})
								});
						})
						.catch(function(err){
							console.log(err);
						})

					session.close();
					res.redirect('/faculty'); 
					

				})
				.catch(function(err){
					console.log(err);
				})

			res.redirect('/faculty'); 
			
		})
		.catch(function(err){
			console.log(err);
		});

	res.redirect('/faculty');
});




app.listen(3000);
console.log('server started on port no. 3000');

module.exports = app;
