/*
    ioBroker.musiccast Widget-Set

    version: "0.0.2"

    Copyright 2018 Author foxthefox<foxthefox@wysiwis.net>
    based on iobroker.vis

*/
"use strict";


// add translations for edit mode
if (vis.editMode) {
    $.extend(true, systemDictionary, {
        "myColor":          {"en": "myColor",       "de": "mainColor",  "ru": "Мой цвет"},
        "myColor_tooltip":  {
            "en": "Description of\x0AmyColor",
            "de": "Beschreibung von\x0AmyColor",
            "ru": "Описание\x0AmyColor"
        },
        "htmlText":         {"en": "htmlText",      "de": "htmlText",   "ru": "htmlText"},
        "group_extraMyset": {"en": "extraMyset",    "de": "extraMyset", "ru": "extraMyset"},
        "extraAttr":        {"en": "extraAttr",     "de": "extraAttr",  "ru": "extraAttr"}
    });
}

// add translations for non-edit mode
$.extend(true, systemDictionary, {
    "Instance":  {"en": "Instance", "de": "Instanz", "ru": "Инстанция"}
});

// this code can be placed directly in musiccast.html
vis.binds.musiccast = {
    version: "0.0.2",
    showVersion: function () {
        if (vis.binds.musiccast.version) {
            console.log('Version musiccast: ' + vis.binds.musiccast.version);
            vis.binds.musiccast.version = null;
        }
    },
    
    //from timeandweather
    getValue: function (oidOrBinding) {
        if (!oidOrBinding) return '';

        if (oidOrBinding[0] === '{') {
            return vis.formatBinding(oidOrBinding);
        } else {
            var val = vis.states.attr(oidOrBinding + '.val');
            if (val === undefined || val === null) return '';
            if (val === 'null') return '';
            return val;
        }
    },
    state: function (el, oid) {
        var $this = $(el);
        var oid = (oid ? oid : $this.attr('data-oid'));
        var val = $this.attr('data-val');

        if (oid) $this.attr('data-oid', oid);

        if (val === 'true')  val = true;
        if (val === 'false') val = false;

        if (!vis.editMode) {
            $this.on('click touchstart', function (e) {
                // Protect against two events
                if (vis.detectBounce(this)) return;

                var oid = $(this).attr('data-oid');

                if ($(this).attr('url-value')) {
                    vis.conn.httpGet($(this).attr('url-value'));
                }

                if (oid) {
                    var val = $(this).attr('data-val');
                    if (val === undefined || val === null) val = false;
                    if (val === 'true')  val = true;
                    if (val === 'false') val = false;
                    if (parseFloat(val).toString() == val) val = parseFloat(val);

                    if (oid) vis.setValue(oid, val);
                }
            });
        }
    },

    //wie state aus basic, soll hier aber 2 unterschiedliche Befehle absetzen
    //die Befehle werden mit dem Status der ID verglichen, wo auch der Befehl abgesetzt wird.
    //dies ist nur für den Button


    //wie state aus basic, es wird immer der Wert über "val" als Befehl ausgegeben
    //wird für repeat und shuffle benutzt
    stateToggle: function (el, oid_toggle) {
        var $this = $(el);
        var oid = (oid_toggle ? oid_toggle : $this.attr('data-oid-toggle'));
        var val = $this.attr('data-val');

        if (oid) $this.attr('data-oid-toggle', oid);

        if (val === 'true')  val = true;
        if (val === 'false') val = false;

        if (!vis.editMode) {
            $this.on('click touchstart', function (e) {
                // Protect against two events
                if (vis.detectBounce(this)) return;

                var oid = $(this).attr('data-oid-toggle');

                if (oid) {
                    var val = $(this).attr('data-val');
                    if (val === undefined || val === null) val = false;
                    if (val === 'true')  val = true;
                    if (val === 'false') val = false;
                    if (parseFloat(val).toString() == val) val = parseFloat(val);

                    if (oid) vis.setValue(oid, val);
                }
            });
        }
    },

    //wie state aus basic, soll hier aber 2 unterschiedliche Befehle absetzen
    //die Befehle werden mit dem Status der ID verglichen, wo auch der Befehl abgesetzt wird.
    //dies ist nur für den Button
    stateBool: function (el, oid, falsecmd, truecmd) {
        var $this = $(el);
        var oid = (oid ? oid : $this.attr('data-oid'));
        var val = vis.states.attr(oid+ '.val');
        var falsecmd = (falsecmd ? falsecmd : $this.attr('data-falsecmd'));
        var truecmd = (truecmd ? truecmd : $this.attr('data-truecmd'));

        if (oid) $this.attr('data-oid', oid); //was macht das hier??

        if (val === 'true')  val = true;
        if (val === 'false') val = false;

        if (!vis.editMode) {
            $this.on('click touchstart', function (e) {
                // Protect against two events
                if (vis.detectBounce(this)) return;

                var oid = $(this).attr('data-oid');

                if (oid) {
                    var val = vis.states.attr(oid + '.val');

                    if (val === undefined || val === null) val = false;
                    if (val === true || val === 'true' || val === truecmd )  val = true; 
                    if (val === false ||val === 'false' || val === falsecmd ) val = false;
                    if (parseFloat(val).toString() == val) val = parseFloat(val);

                    if (oid && val === true ) vis.setValue(oid, falsecmd); 
                    if (oid && val === false ) vis.setValue(oid, truecmd); 
                }
            });
        }
    },

    //wie state aus basic, soll hier aber 2 unterschiedliche Befehle absetzen
    //die Befehle werden mit dem Status einer anderen ID verglichen, wo auch der Befehl abgesetzt wird.
    //dies ist nur für den Button
    stateBool2: function (el, oid, oid_cmd, falsecmd, truecmd) {
        var $this = $(el);
        var oid_cmd = (oid_cmd ? oid_cmd : $this.attr('data-oid-cmd')); //cmd e.g. playPause
        var oid = (oid ? oid : $this.attr('data-oid')); //status e.g. playback
        var val = vis.states.attr(oid+ '.val');
        var falsecmd = (falsecmd ? falsecmd : $this.attr('data-falsecmd'));
        var truecmd = (truecmd ? truecmd : $this.attr('data-truecmd'));

        if (oid) $this.attr('data-oid', oid); //was macht das hier??

        if (val === 'true')  val = true;
        if (val === 'false') val = false;

        if (!vis.editMode) {
            $this.on('click touchstart', function (e) {
                // Protect against two events
                if (vis.detectBounce(this)) return;

                var oid = $(this).attr('data-oid');
                var oid_cmd = $(this).attr('data-oid-cmd');

                if (oid_cmd && oid) {
                    var val = vis.states.attr(oid + '.val');

                    if (val === undefined || val === null) val = false;
                    if (val === 'stop' ) val = false; //wenn playback den Status stop hat, dann ist auch als nächste play zu geben
                    if (val === true || val === 'true' || val === truecmd )  val = true; 
                    if (val === false ||val === 'false' || val === falsecmd ) val = false;
                    if (parseFloat(val).toString() == val) val = parseFloat(val);

                    if (oid && val === true ) vis.setValue(oid_cmd, falsecmd); 
                    if (oid && val === false ) vis.setValue(oid_cmd, truecmd); 
                }
            });
        }
    },

    button: function (el, value) {

        if ($(el).data('no-style')) return;
        setTimeout(function(){
            $(el).button();
        },0)

    },

//; vis.binds.musiccast.buttonToggle(el, data.value)
    buttonToggle: function (el, val) {
        var $this = $(el);
        var oid = $this.attr('data-oid');

        if (!$(el).data('no-style')) {
            setTimeout(function () {
                $(el).button();
            }, 0);
        }
        $(el).click(function () {
            if (val === undefined || val === null) val = false;
            if (val === 'true')  val = true;
            if (val === 'false') val = false;
            if (parseFloat(val).toString() == val) val = parseFloat(val);
            if (!vis.editMode) vis.setValue(oid, val);
        });
    },

    //das ist nur um zwischen der Bildrepräsentation zu wechseln
    //wird für 2md, bool state benutzt
    itoggle: function (el){
        var $this = $(el).parent();
        var oid = $this.parent().attr('data-oid') + '.val';
        var val = vis.states.attr(oid);
        var activeVal = $this.parent().data('truecmd'); //Wert für true Befehl
        if (activeVal === '' || activeVal === undefined) activeVal = null;

        if (activeVal !== null) {
            if (activeVal.toString() == val.toString()) {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').show();
            }
        } else {
            if (val === 'false') val = false;
            if (val === 'true')  val = true;

            if (typeof val == 'string') {
                var f = parseFloat(val);
                if (f == val) {
                    val = f;
                } else if (val !== '') {
                    val = true;
                } else {
                    val = false;
                }

            }
            if (val > 0) {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').show();
            }
        }

        vis.states.bind(oid, function (e, val) {
            if (activeVal !== null) {
                if (activeVal.toString() == val.toString()) {
                    $this.find('.imgToggleFalse').hide();
                    $this.find('.imgToggleTrue').show();
                } else {
                    $this.find('.imgToggleTrue').hide();
                    $this.find('.imgToggleFalse').show();
                }
            } else {
                if (val === true || val === 'true' || parseFloat(val) > 0) {
                    $this.find('.imgToggleFalse').hide();
                    $this.find('.imgToggleTrue').show();
                } else {
                    $this.find('.imgToggleTrue').hide();
                    $this.find('.imgToggleFalse').show();
                }
            }
        });
    },


    //der Vergleich mit activeVal in itoggle bezieht sich auf die Auswertung mit welchen String der aktive Zustand gekennzeichnet ist
    //brauchen wir hier nicht, da mehrere Zustände
    shuffletoggle: function (el){
        var $this = $(el).parent();
        var oid = $this.parent().attr('data-oid') + '.val'; //bezieht sich auf das davorliegende div mit "data-oid" und somit dem Status
        var val = vis.states.attr(oid);

        if (oid) { //wenn es einen definierten Datenpunkt für Status gibt
            if (val === 'off') {
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'on') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').show();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'songs') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').show();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'album') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').show();
            }            
        } else { //Zeige den AUS Zustand
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').hide();
        }

        vis.states.bind(oid, function (e, val) {
            if (val === 'off') {
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'on') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').show();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'songs') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').show();
                $this.find('.imgToggleAlbum').hide();
            }
            else if (val === 'album') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleTrue').hide();
                $this.find('.imgToggleSongs').hide();
                $this.find('.imgToggleAlbum').show();
            }                
            
        });
    },

    repeattoggle: function (el){
        var $this = $(el).parent();
        var oid = $this.parent().attr('data-oid') + '.val'; //bezieht sich auf das davorliegende div mit "data-oid" und somit dem Status
        var val = vis.states.attr(oid);

        if (oid) { //wenn es einen definierten Datenpunkt für Status gibt
            if (val === 'off') {
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'one') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').show();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'all'  || val === 'songs' ) {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').show();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'folder' || val === 'album') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').show();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'ab') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').show();
            }         
        } else { //Zeige den AUS Zustand
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
        }

        vis.states.bind(oid, function (e, val) {
            if (val === 'off') {
                $this.find('.imgToggleFalse').show();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'one') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').show();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'all') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').show();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'folder') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').show();
                $this.find('.imgToggleAB').hide();
            }
            else if (val === 'ab') {
                $this.find('.imgToggleFalse').hide();
                $this.find('.imgToggleOne').hide();
                $this.find('.imgToggleAll').hide();
                $this.find('.imgToggleFolder').hide();
                $this.find('.imgToggleAB').show();
            }                           
        });
    }
};
	
vis.binds.musiccast.showVersion();
