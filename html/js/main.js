

    $.expr[":"].containsi = $.expr.createPseudo(function(arg) {
        return function( elem ) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
    });


    function Application(){
        this.thumbs     = true;
        this.meetupKey  = null;
        this.YQLSource  = null;
        this.events     = {};
        this.socket     = null;
        this.endpoint   = null;
    }


    /**
     * 
     */
    Application.prototype.init = function(){
        var self = this;
        this.showLoadingMessage();
        this.getMemberData(function(){ 
            self.drawList();
            if(self.socket === null){
                self.socket = io.connect(self.endpoint);
            } else{
                self.socket.socket.connect();
            }
            self.addSocketHandlers();
         });
           
    };

    /**
     * 
     * @param _obj
     */
    Application.prototype.size = function(_obj) {
        var size = 0, key;
        for (key in _obj) {
            if (_obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    /**
     * 
     */
    Application.prototype.showLoadingMessage = function(){
        $.blockUI({ css: { 
            border: 'none', 
            padding: '15px', 
            fontSize:'10px !important',
            backgroundColor: '#000', 
            '-webkit-border-radius': '10px', 
            '-moz-border-radius': '10px', 
            opacity: '.5', 
            color: '#fff' 
        } }); 
 
    };

    /**
     * 
     */
    Application.prototype.hideLoadingMessage = function(){
        $.unblockUI();
    };


    /**
     * 
     */
    Application.prototype.addScreenHandlers = function(){ 

        var self = this;
       $('.bar-title .top').on('click', function(){
            window.scrollTo(0,1);
            return false;
       });

       $('.bar-title .refresh').on('click', function(){
            if("undefined" !== typeof localStorage && typeof localStorage.yqlResponse === "string") {
                localStorage.removeItem('yqlResponse');
            }
            window.location.reload();
            return false;
       });



       $('#member-list li.member').on('click', function(){
               var state = $(this).attr('checked-in');
               var newState = !parseInt(state, 10) ? 1 : 0;
               self.changeState($(this), newState);
               self.socket.emit('changeState', { 'member': $(this).attr('id'), state: newState });
               return false;
           });

        var searchTimeout = null;

        var nameSearch = $('#name-search'); 
        nameSearch.on('keyup', function(){
                var self = this;
                window.clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function(){
                    var filter = $(self).val();
                    var memberList = $('#member-list');
                    memberList.find("li:not(:containsi(" + filter + "))").addClass('hidden');
                    memberList.find("li:containsi(" + filter + ")").removeClass('hidden');
                }, 500);
        } );

        $('.search-wrapper .clear-input').on('click', function(){
            nameSearch.val('').trigger('keyup');
            return false;
        });
    };

    /**
     * 
     */
    Application.prototype.addSocketHandlers = function(){

        if(this.addSocketHandlers.flag){
            return false;
        }

        this.addSocketHandlers.flag = true;
        var self = this;


        self.socket.on('disconnect', function(){
            window.location.reload();
        });
    
        self.socket.on('changeState', function(_data){
            self.changeState(_data.member, _data.state);
        });

        self.socket.on('loadData', function(_members){
            _members.forEach(function(_member){
                self.changeState(_member.member, _member.state);
            });
            self.addScreenHandlers();
            self.hideLoadingMessage();
        });
    
        return true;
    
    };

    /**
     * 
     * @param _member
     * @param _state
     */
    Application.prototype.changeState = function(_member, _state){
               if(_member instanceof jQuery) {
                    _member.attr('checked-in', _state);
               } else {
                   $("#" + _member).attr('checked-in', _state);
               }
    };


    /**
     * 
     * @param _cb
     */
    Application.prototype.getMemberData = function(_cb){
        var self = this;
        var yqlRequest = this.YQLSource;
        var yql = "select * from meetup.rsvps where key='" + this.meetupKey + "'";
        var eventConditions = [];

        for(var i in this.events){
            if(this.events.hasOwnProperty(i)){
                eventConditions.push("event_id=" + i);
            }
        }

        yql += " and (" + eventConditions.join(" or ")+ ")";

        yqlRequest += encodeURIComponent(yql);

        
        //try caching data in localStorage;
        if("undefined" !==typeof localStorage && typeof localStorage.yqlResponse === "string"){
            self.handleXHRResponse(JSON.parse(localStorage.yqlResponse), _cb);
        } else{
             $.get(yqlRequest, function(_response){
                localStorage.yqlResponse = JSON.stringify(_response);
                self.handleXHRResponse(_response, _cb);
            });
        }

    };

    /**
     * 
     * @param _result
     * @param _cb
     */
    Application.prototype.handleXHRResponse = function(_result, _cb){
             var self = this;
             var results = _result.query.results.results;

              if(results.length !== self.size(self.events)){
                throw "something bad happened got more/less result sets than requested";
              }
            
	      // get rid of dupes
	      var addedUsers = [];            
 
              results.forEach(function(result){
                var members = result.items.item;
                if(typeof self.events[members[0].event_id] !=="undefined") {
                    self.events[members[0].event_id].members = _.filter(members, function(_member){ 
			addedUsers.push(_member.member_id);
				
                        return (addedUsers.indexOf(_member.member_id) === -1 ) || _member.response==="yes";
                    });
                }
              });

		addedUsers = null;

        
             _cb(); 
    };


    /**
     * 
     * @param _members
     */
    Application.prototype.drawList = function(_members){
          $('#member-list li').remove();
          var self = this;
          memberList = document.createDocumentFragment();
          var eventIDs = [];

          for(var eventsIndex in this.events){
             eventIDs.push(eventsIndex);
          }

         eventIDs.sort();

          for(var eventIDIndex = 0; eventIDIndex < eventIDs.length; eventIDIndex ++) {
                var i = eventIDs[eventIDIndex];
                if(this.events.hasOwnProperty(i)){
                    var memberListDivider = document.createElement('li');
                    memberListDivider.className = 'list-divider';
                    var groupName = document.createTextNode(this.events[i].name);
                    memberListDivider.appendChild(groupName);
                
                    memberList.appendChild(memberListDivider);


                    var cEvent = this.events[i];
                    for(var memberIndex = 0; memberIndex<cEvent.members.length; memberIndex ++){
            
                        _member = cEvent.members[memberIndex];
                        console.log('_member', _member);

                        var memberListItem = document.createElement('li');
                        memberListItem.className = "member";
                        memberListItem.id = _member.id;
                        var checkedInAttribute = document.createAttribute('checked-in');
                        checkedInAttribute.value = 0;
                        memberListItem.setAttributeNodeNS(checkedInAttribute);
                        memberListItem['checked-in'] = false; 
                        var memberName = document.createTextNode(_member.name);
                        memberListItem.appendChild(memberName);

                        if(self.thumbs === true){

                            
                            var profilePicWrapper = document.createElement('div');
                            profilePicWrapper.className = "profile-pic-wrapper";
                            var profilePic = document.createElement('img');

                            profilePic.className = "profile-pic";


                            if(_member.photo_url !== null){
                                profilePic.src = _member.photo_url.replace(/member_/, "thumb_");
                            }
                            profilePicWrapper.appendChild(profilePic);
                            memberListItem.appendChild(profilePicWrapper);
                        }
                        memberList.appendChild(memberListItem);
                    }
                }
          }

         document.getElementById('member-list').appendChild(memberList);
            if(self.thumbs){
                $('.profile-pic-wrapper').nailthumb();
            }


        var totalRSVP = $('#member-list li.member').length;
        $('.title .count').html(totalRSVP);
    };


    /**
     * 
     * @param _key
     */
    Application.prototype.setMeetupKey = function(_key){
        this.meetupKey = _key;
        return this;
    };

    /**
     * 
     * @param _src
     */
    Application.prototype.setYQLSource = function(_src){
        this.YQLSource = _src;
        return this;
    };

    /**
     * 
     * @param _id
     * @param _name
     */
    Application.prototype.addEvent = function(_id, _name){
        if("undefined" !== typeof this.events[_id]){
            return false;
        }
        this.events[_id] = { 'name': _name, 'members':[]};
        return this;
    };

    /**
     * 
     * @param _endpoint
     */
    Application.prototype.setEndpoint = function(_endpoint){
        this.endpoint = _endpoint;
        return this;
    };

