// Just some funny stuff


module.exports = robot => {
    										robot.respond( /good night/, msg =>
    {
        										msg.reply( ":darth-vader: I find your lack of work distrubing. :darth-vader:" );
    } );

    										robot.respond( /go to sleep/, msg =>
    {
        										msg.reply( ":darth-vader: One day you and I will rule the galaxy side by side. :sleeping:" );
    } );
};
