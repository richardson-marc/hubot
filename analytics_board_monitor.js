// Description Gets Leankit Cards

// Commands
// Get Leankit Cards
let config

if (process.env.LEANKIT_ENVIRONMENT == "dev") {
    console.log("firing up with dev config");
    config = require("../configs/config.dev.json")
    console.log(config.boards.analytics.source.board_id);
};
if (process.env.LEANKIT_ENVIRONMENT == "df") {
    console.log("firing up with df config");
    config = require("../configs/config.df.json")
};

const username = process.env.LEANKIT_USER_NAME;
const password = process.env.LEANKIT_PASSWORD;
//const hostname = process.env.LEANKIT_HOSTNAME;
const hostname = config.hostname;
const request = require( "request-promise" );
const baseURL = "https://" + hostname;
const cardUrl = baseURL + "/io/card/";
const boardBaseURL = baseURL + "/io/board";

const auth = "Basic " + new Buffer( username + ":" + password ).toString( "base64" );


//moved from the module.exports
const srcBoardId = config.boards.analytics.source.board_id;
const srcLaneToMoveTo = config.boards.analytics.source.lane_tomove;
const srcLaneId = config.boards.analytics.source.lane_id;
const srcBoardUrl = baseURL + "/io/board/" + srcBoardId + "/card?lanes=" + srcLaneId;
const deploymentTechReviewCoSId = config.boards.analytics.source.techreview_cos;

const targetBoardId = config.boards.analytics.target.board_id;
const targetLaneId = config.boards.analytics.target.lane_id; 
const targetTechReviewClassofServiceID = config.boards.analytics.target.techreview_cos;
const targetCardTypeId = config.boards.analytics.target.cardtype_id;

// console.log(`config settings 
// srcBoardId = ${srcBoardId} 
// srcLaneToMoveTo = ${srcLaneToMoveTo}
// srcLaneId = ${srcLaneId} 
// srcBoardUrl = ${srcBoardUrl}
// deploymentTechReviewCoSId = ${deploymentTechReviewCoSId}
// targetBoardId = ${targetBoardId}
// targetLaneId = ${targetLaneId} 
// targetTechReviewClassofServiceID = ${targetTechReviewClassofServiceID}
// targetCardTypeId = ${targetCardTypeId}`)


async function getBoard ( boardUrl ) {
    try {
        return body = await request.get( {
            url: boardUrl,
            headers: {
        	"Authorization": auth
            },
            json: true
        } )
    } catch(err)
    {
        console.log( `getBoard ${err}` );
        return err;
    }
}

async function getCards ( boardUrl ) {
    try {
        return body = await request.get( {
            url: boardUrl,
            headers: {
        	"Authorization": auth
            },
            json: true
        } )
        //return body;
    } catch(err)
    {
        console.log( `getCards ${err}` );
        return err;
    }
}

async function getCardInfo( cardId ) {
    try {
        let getCardUrl = cardUrl + cardId;
        return body = await request.get( {
            url: getCardUrl,
            headers: {
               "Authorization": auth
            },
            json: true
        } )
    } catch (err)
    {
        console.log(`Get Card Info ${err}`);
        return err;   
    }
}

async function createCard( createJSON ) {
    try {
        return body = await request.post( {
            url: cardUrl,
            headers: {
        	    "Authorization": auth,
                "Content-Type": "application/json"
            },
            body: createJSON,
            json: true
        } )
    } catch (err)
    {
        console.log(`Create card ${err}`);
        return err;
    }

}
async function moveCard ( cardId, moveJSON ){
    let cardMoveUrl = cardUrl + cardId
    try {
        return body = await request.patch( {
            url: cardMoveUrl,
            headers: {
        	    "Authorization": auth,
                "Content-Type": "application/json"
            },
            body: moveJSON,
            json: true
        } );
    } catch (err)
    {
        console.log(`Move card ${err}`);
        moveCardError = err;
        return err;
    }
}

async function cardCreateSlackMessage ( newCardId, robot ) {
        let newCard = await getCardInfo ( newCardId );
        let fullCardUrl = baseURL + "/boards/View/" + targetBoardId + "/" + newCard.id;
        let cardDescription;
        if( !newCard.description ) {
            cardDescription = "";
        }
        else {
            cardDescription = newCard.description;
        }
        cardDescription = JSON.stringify(cardDescription);
        cardTitle = JSON.stringify(newCard.title);
        let msgObj = `[{ "title": ${ cardTitle }, "title_link": "${ fullCardUrl }", "text": ${ cardDescription }, "pretext": "A card was created on the ${ newCard.board.title } board", "footer": "Darthbot", "color": "#ffffff" }]`;
        robot.adapter.client.web.chat.postMessage( "pd-ae", "Card Creation Message", { "attachments": msgObj, "as_user": "true" } );
        return newCard.id;
};

async function slowYourRoll () {
    return;
}

async function cardTagCreator ( cardData ) {
    let cardTags = cardData.tags;
    if ( cardData.customFields[ 1 ].value ) {
        let cardCustomFieldURL = cardData.customFields[ 1 ].value;
        let splitcardCustomFieldURL = cardCustomFieldURL.split("/");
        if ( splitcardCustomFieldURL[ 4 ] ) {
            if ( cardTags.findIndex(arrayFinder, splitcardCustomFieldURL[ 4 ]) == -1 ) {
                cardTags.push( splitcardCustomFieldURL[ 4 ] );
            }
        }
    }
    if ( cardData.customFields[ 0 ].value ) {
        let cardCustomField = cardData.customFields[ 0 ].value;
        if ( cardCustomField ) {
            if ( cardTags.findIndex(arrayFinder, cardCustomField) == -1 ) {
                cardTags.push( cardCustomField );
            }
        }
    }    
    return cardTags;
}

function arrayFinder(element, index, array) {
    return element = this.value;
}


module.exports = robot => {
	console.log( "DarthBot Analytics Board Monitor initializing...." );
	monitorCard();
	let moveCardError = null;
    let j = 0;
    async function monitorCard( ) {
        //First check the wipLimit if it's already bad hombres bail, setTimeout and start over
        let boardDataUrl = `${boardBaseURL}/${srcBoardId}`;
        let boardData = await getBoard( boardDataUrl );

        let boardLane = await boardData.lanes.find(x => x.id === srcLaneToMoveTo);

        if(boardLane.wipLimit > 0 && boardLane.cardCount >= boardLane.wipLimit){
            console.log( `WIP is at or over the limit in ${boardLane.name}`)
            setTimeout( () => monitorCard(), 300000)
            return;
        }       
        //Second move the parent card to the next lane
        let cards = await getCards( srcBoardUrl );
        if (cards.pageMeta.totalRecords == 0){
            setTimeout( () => monitorCard(), 120000)
            return;
        }
        if (cards.pageMeta.totalRecords > 0)
        { 
            console.log ("About to get my first piece of work");
            await nextCard(0);
        }
                
        async function nextCard( i ){
            j = i + 1;
            let card = cards.cards[i]
            
            let cardMoveJSON = [ {
                op: "replace",
                path: "/laneId",
                value: srcLaneToMoveTo
            } ];
            //setTimeout( () => moveCard( card.id, cardMoveJSON ), 10000);
            let cardMove = await moveCard( card.id, cardMoveJSON );
            setTimeout( () => slowYourRoll, 10000);
            if (cardMove.statusCode == 422){
                setTimeout( () => monitorCard(), 120000);
                return;
            };            
            
            let cardData = await getCardInfo( card.id );
            let cardDataTags = await cardTagCreator ( cardData );
            
            let cardCreateJSON = {
                boardId: targetBoardId,
                typeId: targetCardTypeId,
                title: cardData.title,
                parentCardId: cardData.id,
                laneId: targetLaneId,
                tags: cardDataTags,
                priority: cardData.priority
            }
            if ( cardData.description ) {
                cardCreateJSON.description = cardData.description;
            }
            if ( cardData.customFields[ 1 ].value ){
                cardCreateJSON.externalLink = { 
                    url: cardData.customFields[ 1 ].value,
                    label: "PR to develop"
                }
                let cardCustomId = cardData.customFields[ 1 ].value;
                let cardCustomIdSplit = cardCustomId.split("/");
                if( cardCustomIdSplit[ 4 ] ) {
                    cardCreateJSON.customId = cardCustomIdSplit[ 4 ]
                }                
            }
            let cardClassofService = "";
            let childCardClassofService = "";
            if ( cardData.customIcon ) {
                cardClassofService = cardData.customIcon.title;
                if ( cardClassofService == "Technical Review (No QA)" ) {
                    childCardClassofService = targetTechReviewClassofServiceID;
                    cardCreateJSON.customIconId = targetTechReviewClassofServiceID;
                }
            }
            let createSingleCard = await createCard( cardCreateJSON );
            let cardCreateSlackMsg = await cardCreateSlackMessage ( createSingleCard.id, robot );
            
            
            if( i < (cards.cards.length - 1) ){
                console.log(`About to get card ${i} out of ${cards.cards.length}`)
                setTimeout( () => nextCard(i+1), 10000);
                               
                }    
            else if( j >= (cards.cards.length - 1) ){
                console.log("starting the madness again!!");
                setTimeout( () => monitorCard(), 120000)
            }
        };
        
    };
};