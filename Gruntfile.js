module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        s3: {
            // assumes you've set env vars AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
            bucket: "nbt-static",
            access: "public-read",
            upload: [
                {
                    src: "src/main/webapp/index.html",
                    dest: "weatherblur/map/unstable/index.html"
                },
                {
                    src: "src/main/webapp/assets/*",
                    dest: "weatherblur/map/unstable/assets/"
                },
                {
                    src: "src/main/webapp/lib/onyx/images/*",
                    dest: "weatherblur/map/unstable/lib/onyx/images/"
                },
                {
                    src: "src/main/webapp/build/*",
                    dest: "weatherblur/map/unstable/build/",
                    gzip: true
                }
            ]
        },
        shell: {
			enyo: {
				command: 'bash scripts/build.sh'
			}
        },
        clean: [ 'src/main/webapp/build' ]
    });

    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-s3');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('test', [ 'mocha' ]);
    grunt.registerTask('build', [ 'clean', 'shell:enyo' ]);
    grunt.registerTask('deploy', [ 'clean', 'build', 's3' ]);
};
