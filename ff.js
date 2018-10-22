var gamecfg = {
  'gardens': [-1,0,8,12,15,19],
  'max_distance': [-1,0,8,10,12,14],
}
var game = {
  'Players': [{},{},{},{},{}],
}

var type_name = {
   'P': "PowerPlant",
   'S': "StoreWearhouse",
   'O': "OilDepot",
   'F': "FishMarket",
   'f': "fishStore",
   'p': "powerDump",
   's': "storeFront",
   'o': "oilStation",
   'g': "garden",
   'r': "road"
 }

Array.prototype.shuffle = function() {
    var s = [];
    while (this.length) s.push(this.splice(Math.random() * this.length, 1)[0]);
    while (s.length) this.push(s.pop());
    return this;
}

function select(x,y) {
    if (game.auction) {
        return;
    }
    var player = game.player_idx;
    if (game.placing != -1) {
       player = game.placing;
    }
    place(player,game.place_type.charAt(0),x,y,true);
}

function place(p,t,x,y, local)
{
    if (local && game.Players[p].peer != undefined) {
       return;
    }
    var tile = document.getElementById(x+'_'+y);
    if (game.placing == -1                      &&
        tile.className == 'cell empty'          &&
        game.Players[p].markers   &&
        check_tile(x,y)) {
        if (!game.first_turn &&
            (game.Board[x-1][y] == 'e' || game.Board[x-1][y] == 'x') &&
            (game.Board[x+1][y] == 'e' || game.Board[x+1][y] == 'x') &&
            (game.Board[x][y-1] == 'e' || game.Board[x][y-1] == 'x') &&
            (game.Board[x][y+1] == 'e' || game.Board[x][y+1] == 'x')) {
               return;
        }
        if (local) { game_cmd_send("mark:"+p+":"+x+":"+y); }
        game.Players[p].markers -= 1;
        game.Players[p].placed += 1;
        tile.className = 'cell p'+p
        game.Board[x][y] = ""+p;
        update_player(p);
        update_active();
        next_player();
    } else if (game.placing != -1 && tile.className == 'cell p'+game.placing) {
        make_building(x,y,t);
        if (t != 'g' && t != 'r') {
            var inner_tile = document.getElementById(x+'_'+y+'_inner');
            inner_tile.className = 'p'+game.placing;
            game.Players[game.placing][t] = [0];
        }
        if (local) { game_cmd_send("place:"+p+":"+t+":"+x+":"+y); }
        scan_board();
        game.players_done = 0;
       for(var i = 0; i < game.max_player; i++) {
        update_player(game.player_order[i]);
       }
        if (game.placing == game.player_idx) {
            next_player();
        }
        game.placing = -1;
        update_active();
    }
}

// Roads are required either to 
//   a) Every potental building must be able to access the road system
//   b) There must be only one road system. ** Not checked **
// Returns false if occupied or if no path out of here.
// Returns list of pathes out.
function check_tile(x,y) {
    x = +x;
    y = +y;
    var tile = game.Board[x][y];
    if (tile != "g") {
        var count = 0;
        var path = [];
        if (game.Board[x-1][y].charAt(0) < '9' || game.Board[x-1][y] == 'e' || game.Board[x-1][y] == 'r') {
            count += 1;
            path.push((x-1)+'_'+(y))
        }
        if (game.Board[x+1][y].charAt(0) < '9' || game.Board[x+1][y] == 'e' || game.Board[x+1][y] == 'r') {
            count += 1;
            path.push((x+1)+'_'+(y))
        }
        if (game.Board[x][y-1].charAt(0) < '9' || game.Board[x][y-1] == 'e' || game.Board[x][y-1] == 'r') {
            count += 1;
            path.push((x)+'_'+(y-1))
        }
        if (game.Board[x][y+1].charAt(0) < '9' || game.Board[x][y+1] == 'e' || game.Board[x][y+1] == 'r') {
            count += 1;
            path.push((x)+'_'+(y+1))
        }
        if (count == 0) {
            return false;
        }
        return path;
    }
    return false;
}

// Scan for required roads.
// Roads are required either to 
//   a) Every potental building must be able to access the road system
//   b) there must be only one road system.
function scan_board() {
    var made_road = false;
    var unvisited = [];
    for (var x=1; x < game.max_player+6; x++) {
        for (var y=1; y < game.max_player+6; y++) {
            if (game.Board[x][y] != "g") {
                unvisited.push(x+'_'+y);
            }
        }
    }

    var done = []
    var item;

    var list = unvisited.slice();
    while (unvisited.length) {
        item = unvisited.shift();
        var c = item.split('_');
        var x = +c[0];
        var y = +c[1];
        var res = check_tile(x,y);
        if (res && res.length == 1) { // This tile has just one path
            // Make it a road.
            var r = res[0].split('_');
            make_road(r[0],r[1]);
        }
        if (game.Board[x][y] == 'r' || game.Board[x][y] == 'e' || game.Board[x][y].charAt(0) < '9') {
            var remaining = list.slice();
            idx = remaining.indexOf(item);
            remaining.splice(idx,1); // Remove from list.
            var idx;
            var queue = [res[0]];
            while (queue.length) {
                item = queue.shift();
                idx = remaining.indexOf(item);
                if (idx == -1) {
                    continue;
                }

                remaining.splice(idx,1); // Remove from list.
                var r = item.split('_');
                if (game.Board[r[0]][r[1]] != 'r' && game.Board[r[0]][r[1]] != 'e' && game.Board[r[0]][r[1]].charAt(0) > '9') {
                    continue;
                }
                queue.push((+r[0]+1)+'_'+(+r[1]));
                queue.push((+r[0]-1)+'_'+(+r[1]));
                queue.push((+r[0])+'_'+(+r[1]+1));
                queue.push((+r[0])+'_'+(+r[1]-1));
            }
            if (remaining.length ) {
                make_road(x,y)
            }
        }
    }
    determine_distance();
}

function determine_distance_of(x,y,t)
{
    var queue = [];
    var player_loc = [];
    var res = [];
    var visited = new Array(1+game.max_player+5+1);
    for(var r = 0; r < 1+game.max_player+5+1; r++) {
        visited[r] = new Array(1+game.max_player+5+1);
    }
    visited[x][y] = [0,true];
    res = check_tile(x,y);
    queue = res
    res.forEach(function (r) {
         var l = r.split('_');
         visited[l[0]][l[1]] = [1,game.Board[l[0]][l[1]] == 'r'?true:false];
    });
    while(queue.length) {
        var item;
        var dist = [98,false];
        item = queue.shift().split('_');
        x=+item[0];
        y=+item[1];

        if (visited[x][y]) {
            dist = visited[x][y];
            dist[0] -= 1; // bias to in flight answer, will +1 again when updating visited.
        }

        [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].forEach(function(l){
            if (!visited[l[0]][l[1]]) {
                visited[l[0]][l[1]] = [99,false];
            }
         if (game.Board[l[0]][l[1]].charAt(0) < '9' ||
             game.Board[l[0]][l[1]] == 'e'          ||
             game.Board[l[0]][l[1]] == 'r') {
            if (visited[l[0]][l[1]][0] > dist[0]) {
               return;
            }
            if ((visited[l[0]][l[1]][0] == dist[0]) &&
                (visited[l[0]][l[1]][1] <= dist[1])) {
               return;
            }
            dist = visited[l[0]][l[1]].slice(0)
            if (game.Board[l[0]][l[1]] != 'r') {
              dist[1] = false;
            }
         }
        });
         if (game.Board[x][y].charAt(0) < '9' ||
             game.Board[x][y] == 'e'          ||
             game.Board[x][y] == 'r') {

              [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].forEach(function(l){
               if (visited[l[0]][l[1]][0] <= dist[0]) {
                   return;
               }
               if (game.Board[l[0]][l[1]] == 'x' ||
                   game.Board[l[0]][l[1]] == 'g') {
                   return;
               }
               queue.push(l[0]+'_'+l[1]);
              });
          }

        dist[0] += 1;
        visited[x][y] = dist.slice(0);
        if ( game.Board[x][y].length == 2 && game.Board[x][y].charAt(0) == t ) {
            player_loc[game.Board[x][y].charAt(1)] = [game.Board[x][y].charAt(1),dist[0]-1,dist[1]];
        }
    }

    player_loc.forEach(function (p) {
        if(p == []) {
            return;
        }
        if(p[1] > gamecfg.max_distance[game.max_player]) { p[1] = gamecfg.max_distance[game.max_player]; p[2] = true; }

        game.Players[p[0]][t] = [p[1], p[2]?'=':''];
        game.Players[p[0]].total = game.Players[p[0]].money - (
                          (game.Players[p[0]].f?+game.Players[p[0]].f[0]:0) +
                          (game.Players[p[0]].s?+game.Players[p[0]].s[0]:0) +
                          (game.Players[p[0]].o?+game.Players[p[0]].o[0]:0) +
                          (game.Players[p[0]].p?+game.Players[p[0]].p[0]:0));
    });
}

function determine_distance()
{
    for(var f in game.source) {
        determine_distance_of(game.source[f][0], game.source[f][1], f.charAt(0).toLowerCase());
    }
}

function make_building(x,y,type) {
    var tile = document.getElementById(x+'_'+y);
    var p = game.Board[x][y].charAt(0);
    if (p < '9') {
        game.Players[p].placed -= 1;
    } else {
        game.Board[x][y] = '';
    }

    if (p < '9' && type == 'g' || type == 'r') { // Is any player marking this tile, give marker back.
        game.Players[p].markers += 1;
        game.Board[x][y] = '';
    }
    if (p < '9' && type != 'g' && type != 'r' && game.Players[p].extra) { // Is any player marking this tile, give marker back.
        game.Players[p].markers += 1;
        game.Players[p].extra -= 1;
    }
    tile.className = "cell "+type_name[type]
    game.Board[x][y] = type+game.Board[x][y];
}

function make_road(x,y) {
    var road = document.getElementById(x+'_'+y);

    var p = game.Board[x][y].charAt(0);
    if (p == 'r') {
        return;
    }
    if (p < '9') { // Is any player marking this tile, give marker back.
        game.Players[p].markers += 1;
        game.Players[p].placed -= 1;
        update_player(p);
    }
    road.className = "cell "+"road";
    game.Board[x][y] = 'r';
}

function next_player() {
    p = game.player_order.indexOf(game.player_idx)
    p += 1;
    if (p == game.max_player) {
        p = 0;
        game.first_turn = false;
    }
    game.player_idx = game.player_order[p];
    update_active();
}

function update_player(p) {
   var done = 0;
    var ap = document.getElementById("p"+p+"_name");
    ap.value = game.Players[p].name;
    var ap = document.getElementById("p"+p+"_markers");
    ap.innerText = game.Players[p].markers+" (+"+game.Players[p].extra+")";
    var ap = document.getElementById("p"+p+"_money");
    ap.innerText = game.Players[p].money;
        var ap = document.getElementById("p"+p+"_f");
        ap.innerText = '';
    if (game.Players[p].f !== undefined) {
        ap.innerText = game.Players[p].f.join(' ');
        if(game.Players[p].f.length == 2 && game.Players[p].f[2] == '=') { done += 1; }
    }
        var ap = document.getElementById("p"+p+"_s");
        ap.innerText = '';
    if (game.Players[p].s !== undefined) {
        ap.innerText = game.Players[p].s.join(' ');
        if(game.Players[p].s.length == 2 && game.Players[p].s[2] == '=') { done += 1; }
    }
        var ap = document.getElementById("p"+p+"_o");
        ap.innerText = '';
    if (game.Players[p].o !== undefined) {
        ap.innerText = game.Players[p].o.join(' ');
        if(game.Players[p].o.length == 2 && game.Players[p].o[2] == '=') { done += 1; }
    }
        var ap = document.getElementById("p"+p+"_p");
        ap.innerText = '';
    if (game.Players[p].p !== undefined) {
        ap.innerText = game.Players[p].p.join(' ');
        if(game.Players[p].p.length == 2 && game.Players[p].p[2] == '=') { done += 1; }
    }
    if (game.Players[p].total !== undefined) {
        var ap = document.getElementById("p"+p+"_total");
        ap.innerText = game.Players[p].total;
    }
    if (done == 4 && !game.Player[p].done) { game.Players[p].done = 1; game.players_done += 1; }
    if (game.players_done == game.max_player) {
      end();
    }
}

function update_active() {
    var ap = document.getElementById("active_player");
    ap.innerText = game.Players[game.player_idx].name;
    ap.className = "p"+game.player_idx;
    ap = document.getElementById("active_markers");
    ap.innerText = game.Players[game.player_idx].markers;

    ap = document.getElementById("pulled_state");
    ap.innerText = "";
    ap.className = "";
    ap = document.getElementById("pulled_tile");
    ap.className = "";
    ap = document.getElementById("pulled_inner");
    ap.className = "";
    if (game.Tiles.length != 0) {
        ap = document.getElementById("ptile");
        ap.hidden=false;
    } else {
      if (game.Players[game.player_idx].placed != 0) {
        ap = document.getElementById("proad");
        ap.hidden=false;
        ap = document.getElementById("pgarden");
        ap.hidden=false;
      }
      ap = document.getElementById("ppass");
      ap.hidden=false;
    }
    ap = document.getElementById("bid");
    ap.hidden=true;
}

function winauction(p, bid) {
    ap = document.getElementById("bid");
    ap.hidden=true;
    game.placing = p;
    game.Players[p].money -= +bid;
    game.auction = false;
    if (game.Players[game.placing].placed == 0) {
        // No where to put it, sorry.
        game.Players[game.placing][game.place_type.charAt(0)] = [];
        game.Players[game.placing][game.place_type.charAt(0)][0] = gamecfg.max_distance[game.max_player];
        game.Players[game.placing][game.place_type.charAt(0)][1] = 'X';
        update_player(game.placing);
        game.placing = -1;
        update_active();
        return;
    }
    showplace();
}

function bid(p, current_bid) {
    var ap = document.getElementById("p"+p+"_bid");
    var bid = +ap.value;

    if (ap.hidden) { return -1; }
    if (ap.value == "") {
        return -2;
    }
    if (bid < 0) {
        bid = 0;
    }
    if (bid > game.Players[p].money) {
        bid = game.Players[p].money;
    }
    if (bid > current_bid) {
        return bid;
    }
    return -1;
}

function click_bid() {
   if (bid_done()) {
       game_cmd_send("bid_resolve");
   }
}

function bid_done() {
        var winner;
        var b = -1;

        for(var w = game.player_order.indexOf(game.player_idx)+1; w < game.max_player; w++) {
            var p = game.player_order[w];
            var v = bid(p,b);
            if (v == -2) {
                return false;
            }
            if (v >= 0) {
                winner = p;
                b = v;
            }
        }
        for(var w = 0; w <= game.player_order.indexOf(game.player_idx); w++) {
            var p = game.player_order[w];
            var v = bid(p,b);
            if (v == -2) {
                return false;
            }
            if (v >= 0) {
                winner = p;
                b = v;
            }
        }

        winauction(winner, b);
}

function showplace() {
        var ap = document.getElementById("pulled_state");
        ap.innerText = "placing";
        ap = document.getElementById("pulled_tile");
        ap.className = 'cell '+game.place_type;
        ap = document.getElementById("pulled_inner");
        ap.className = "p"+game.placing;

        ap = document.getElementById("proad");
        ap.hidden=true;
        ap = document.getElementById("pgarden");
        ap.hidden=true;
        ap = document.getElementById("ppass");
        ap.hidden=true;
}
function placegarden() {
   if (0) { // need to go thru the motions.
    if (game.Players[game.player_idx].peer != undefined) {
       return;
    }
   }
        game.place_type = 'garden'
        game.placing = game.player_idx;
        showplace();
}
function placeroad() {
    if (game.Players[game.player_idx].peer != undefined) {
       return;
    }
        game.place_type = 'road'
        game.placing = game.player_idx;
        showplace();
}

function pass() {
    if (game.Players[game.player_idx].peer != undefined) {
       return;
    }
  next_player();
}

function pulltile() {
    if (game.Players[game.player_idx].peer != undefined) {
       return;
    }
    if (game.Players[game.player_idx].placed == 0) {
        ap = document.getElementById("pulled_state");
        ap.innerText = "No markers, can't pull";
        return;
    }
    // Draw a random one
    game.place_type = game.Tiles.splice(Math.random() * game.Tiles.length, 1)[0];
    game_cmd_send("tile:"+game.player_idx+":"+game.place_type);
    tile(game.player_idx, game.place_type, true);
}

function tile(p,t,local)
{
   if (!local && game.Tiles.length) {
    game.place_type = game.Tiles.splice(Math.random() * game.Tiles.length, 1)[0];
    if (game.place_type != t) { alert ("tile pull out of sync");}
   }

    ap = document.getElementById("tcount");
    ap.innerText=game.Tiles.length;
    ap = document.getElementById("ptile");
    ap.hidden=true;
    if (game.place_type == "garden") {
        placegarden();
    } else {
        var bidding = 0;
        var bidder;
        for(var i = 0; i < game.max_player; i++) {
            var p = game.player_order[i];
            var ap = document.getElementById("p"+p+"_bid");
            if (game.Players[p][game.place_type.charAt(0)] !== undefined) {
                ap.hidden=true;
            } else {
                bidding += 1;
                bidder = i;
                ap.value = "";
                ap.hidden=false;
            }
        }
        if (bidding > 1) {
            game.auction = true;
            var ap = document.getElementById("pulled_state");
            ap.innerText = "auctioning";
            ap = document.getElementById("pulled_tile");
            ap.className = 'cell '+game.place_type;
            ap = document.getElementById("pulled_inner");
            ap.className = "";
            ap = document.getElementById("bid");
            ap.hidden=false;

            var pbid = document.getElementById("pbid");
            for(var w = game.player_order.indexOf(game.player_idx)+1; w < game.max_player; w++) {
                var prow = document.getElementById("p"+game.player_order[w]+"_bid");
                pbid.parentNode.insertBefore(prow.parentNode.removeChild(prow), pbid);
            }
            for(var w = 0; w <= game.player_order.indexOf(game.player_idx); w++) {
                var prow = document.getElementById("p"+game.player_order[w]+"_bid");
                pbid.parentNode.insertBefore(prow.parentNode.removeChild(prow), pbid);
            }
        } else {
            winauction(game.player_order[bidder],0);
        }
    }
}


function end()
{
   game_cmd_send("end");
   end_game()
}
function end_game()
{
    ap = document.getElementById("restart");
    ap.hidden=false;
}

function restart() {
    ap = document.getElementById("restart");
    ap.hidden=true;
    ap = document.getElementById("start");
    ap.hidden=false;

    for(var i=0; i < 5; i++) {
            var ap = document.getElementById("p"+i);
            ap.hidden = false;
            var ap = document.getElementById("p"+i+"_bid");
            ap.hidden = false;
    }
}

function start() {
   var seed = Math.seedrandom(Date.now());

   game_cmd_send("start:"+seed);
   start_game(seed);
}

function start_game(s) {
    ap = document.getElementById("start");
    ap.hidden=true;

    Math.seedrandom(s);

    game.Tiles = [];
    game.player_order = [];
    game.max_player = 0;
    game.first_turn = true;
    game.auction = false;
    game.placing = -1;
    game.place_type = "empty";

    var tbl = document.getElementById('players');
    var rows = tbl.getElementsByTagName('tr');
    var r;
    for(var i=0; i < 5; i++) {
        var ap = document.getElementById("p"+i+"_name");
        if (ap.value == '') {
            var ap = document.getElementById("p"+i);
            ap.hidden = true;
            var ap = document.getElementById("p"+i+"_bid");
            ap.hidden = true;
        } else {
            game.Players[i].name=ap.value;
            game.Players[i].markers=6;
            game.Players[i].extra=2;
            game.Players[i].money=15;
            game.Players[i].placed=0;
            game.Players[i].row=rows[i+1];
            game.Players[i].f = undefined;
            game.Players[i].p = undefined;
            game.Players[i].o = undefined;
            game.Players[i].s = undefined;
            game.Players[i].total = 15
            game.player_order.push(i);
            game.max_player++;
        }
    }
    game.player_order.shuffle()

    // Show players in turn order
    var after = rows[0];
    for(var i=0; i< game.max_player; i++) {
        prow=game.Players[game.player_order[i]].row;
        after.parentNode.insertBefore(prow.parentNode.removeChild(prow), after.nextSibling);
        after=prow;
    }
    // Fill in board area.
    game.Board = [];
    game.Board[0] = new Array(1+game.max_player+5+1);
    for(var c = 0; c < 1+game.max_player+5+1; c++) {
      game.Board[0][c] = 'x';
    }
    for(r = 1; r < 1+game.max_player+5; r++) {
      var c = 0;
      game.Board[r] = new Array(1+game.max_player+5+1);
      game.Board[r][c] = 'x'; c+=1;
      for(; c < 1+game.max_player+5; c++) {
        game.Board[r][c] = 'e';
        var ap = document.getElementById(r+'_'+c);
        ap.hidden = false;
        ap.className='cell empty';
        var ap = document.getElementById(r+'_'+c+'_inner');
        ap.className='';
      }
      game.Board[r][c] = 'x'; c+=1;
    }
    game.Board[r] = new Array(1+game.max_player+5+1);
    for(var c = 0; c < 1+game.max_player+5+1; c++) {
      game.Board[r][c] = 'x';
    }

    var fac=["PowerPlant","StoreWearhouse","OilDepot"];
    game.source = {}
    game.source["FishMarket"] = [1,1];
    make_building(1,1,"F");
    fac.shuffle();
    game.source[fac[0]] = [6+Math.floor(Math.random()*game.max_player),1+Math.floor(Math.random()*5)];
    make_building(game.source[fac[0]][0],game.source[fac[0]][1],fac[0].charAt(0));
    game.source[fac[1]] = [1+Math.floor(Math.random()*5),6+Math.floor(Math.random()*game.max_player)];
    make_building(game.source[fac[1]][0],game.source[fac[1]][1],fac[1].charAt(0));
    game.source[fac[2]] = [6+Math.floor(Math.random()*game.max_player),6+Math.floor(Math.random()*game.max_player)];
    make_building(game.source[fac[2]][0],game.source[fac[2]][1],fac[2].charAt(0));
    scan_board();
    for(var i=0; i < game.max_player; i++) {
        game.Tiles.push("fishStore");
        game.Tiles.push("powerDump");
        game.Tiles.push("storeFront");
        game.Tiles.push("oilStation");
    }
    for (var i=0; i < gamecfg.gardens[game.max_player]; i++) {
        game.Tiles.push("garden");
    }
    ap = document.getElementById("tcount");
    ap.innerText=game.Tiles.length;
    for(var i = 0; i < game.max_player; i++) {
        update_player(game.player_order[i]);
    }
    game.player_idx = game.player_order[0];
    update_active();
}

// Multi screen interface
function game_cmd(c, data)
{
   var cmd = data.split(':');

   if (cmd[0] == 'name') {
      var ap = document.getElementById("p"+cmd[1]+"_name");
      ap.value = cmd[2];
      var ap = document.getElementById("p"+cmd[1]+"_peer");
      ap.innerText = c.peer;
      game.Players[+cmd[1]].peer = c.peer;
   }
   else if (cmd[0] == 'bid') {
      var ap = document.getElementById("p"+cmd[1]+"_bid");
      ap.value = cmd[2];
   } else if (cmd[0] == 'mark') {
      place(+cmd[1],undefined,+cmd[2],+cmd[3], false);
   } else if (cmd[0] == 'tile') {
      tile(+cmd[1],cmd[2], false);
   } else if (cmd[0] == 'bid_resolve') {
      bid_done();
   } else if (cmd[0] == 'place') {
      place(+cmd[1],cmd[2],+cmd[3],+cmd[4], false);
   } else if (cmd[0] == 'start') {
      start_game(cmd[1]); // seed
   } else if (cmd[0] == 'end') {
      end_game();
   }
}

function update_name(p)
{
   var ap = document.getElementById("p"+p+"_name");
   game_cmd_send("name:"+p+":"+ ap.value);
}

function update_bid(p)
{
   var ap = document.getElementById("p"+p+"_bid");
   game_cmd_send("bid:"+p+":"+ ap.value);
}
