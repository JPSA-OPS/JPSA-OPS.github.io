// Simple modular Phaser fight engine using AFG_CHARACTERS and AFG_STAGES
(function(){
  const GAME_WIDTH = 980, GAME_HEIGHT = 540;
  const sel = JSON.parse(localStorage.getItem('afg_selected') || JSON.stringify({id:'lucas',name:'Lucas'}));
  const stage = localStorage.getItem('afg_stage') || 'Abasto';
  const isTraining = localStorage.getItem('afg_training') === 'true';
  const isStory = localStorage.getItem('afg_story') === 'true';
  const MUSIC_PATH = 'assets/music/theme.mp3';

  class Boot extends Phaser.Scene {
    preload(){}
    create(){ this.scene.start('FightScene'); }
  }

  class FightScene extends Phaser.Scene {
    constructor(){ super('FightScene'); }
    create(){
      this.music = document.createElement('audio'); this.music.src = MUSIC_PATH; this.music.loop = true; this.music.volume = 0.7;
      this.music.addEventListener('error', ()=>{});
      document.getElementById('status').textContent = 'Stage: ' + stage + (isTraining? ' • Training' : (isStory? ' • Story' : ''));
      const st = window.AFG_STAGES && window.AFG_STAGES[stage] ? window.AFG_STAGES[stage] : {bgColor:0x071227};
      this.cameras.main.setBackgroundColor(st.bgColor);
      this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT-60, GAME_WIDTH, 120, 0x0f1724);

      const p1data = window.AFG_CHARACTERS && window.AFG_CHARACTERS[sel.id] ? window.AFG_CHARACTERS[sel.id] : window.AFG_CHARACTERS['lucas'];
      const p2data = window.AFG_CHARACTERS['sebas'];
      this.p1 = new Player(this, 220, GAME_HEIGHT-60, p1data, false);
      this.p2 = new Player(this, 760, GAME_HEIGHT-60, p2data, true, isTraining);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

      try{ this.music.play().catch(()=>{}); }catch(e){}
    }
    update(time, delta){
      this.p1.update(this.cursors, this.keyJ, this.keyK, this.p2);
      this.p2.aiUpdate(this.p1);
      if(this.p1.isAttacking && Phaser.Geom.Intersects.RectangleToRectangle(this.p1.attackBox.getBounds(), this.p2.sprite.getBounds())){
        if(!this.p2.justHit){ this.p2.takeHit(this.p1.attackPower); this.p2.justHit = 200; }
      }
      if(this.p2.isAttacking && Phaser.Geom.Intersects.RectangleToRectangle(this.p2.attackBox.getBounds(), this.p1.sprite.getBounds())){
        if(!this.p1.justHit){ this.p1.takeHit(this.p2.attackPower); this.p1.justHit = 200; }
      }
      if(this.p1.justHit) this.p1.justHit -= delta; else this.p1.justHit = 0;
      if(this.p2.justHit) this.p2.justHit -= delta; else this.p2.justHit = 0;
      if(this.p1.hp <=0 || this.p2.hp <=0){
        const winner = this.p1.hp > this.p2.hp ? this.p1.name : this.p2.name;
        document.getElementById('status').textContent = winner + ' wins! Returning to menu...';
        try{ this.music.pause(); this.music.currentTime = 0; }catch(e){}
        this.time.delayedCall(2200, ()=>{ localStorage.removeItem('afg_training'); localStorage.removeItem('afg_story'); window.location='index.html'; });
      }
    }
  }

  class Player {
    constructor(scene, x, groundY, data, flip=false, dummy=false){
      this.scene = scene; this.name = data.name; this.maxHp = data.hp; this.hp = data.hp; this.color = data.color; this.dummy = dummy;
      this.sprite = scene.add.rectangle(x, groundY-56, 64, 112, data.color).setOrigin(0.5,1);
      scene.physics.add.existing(this.sprite); this.sprite.body.setSize(40,100).setOffset(12,12);
      this.attackBox = scene.add.rectangle(x+40, groundY-120, 48, 28, 0xffffff, 0.0); scene.physics.add.existing(this.attackBox);
      this.isAttacking=false; this.attackPower=8; this.attackTimer=0; this.justHit=0;
      this.speed = 220; this.jumpSpeed = -420;
      this.label = scene.add.text(x, groundY-180, this.name, {fontSize:'14px',color:'#fff'}).setOrigin(0.5);
    }
    update(cursors, keyJ, keyK, enemy){
      const body = this.sprite.body;
      if(this.dummy) { body.velocity.x = 0; }
      else {
        body.velocity.x = 0;
        if(cursors.left.isDown) body.velocity.x = -this.speed;
        else if(cursors.right.isDown) body.velocity.x = this.speed;
        if(Phaser.Input.Keyboard.JustDown(cursors.up) && body.onFloor()) body.velocity.y = this.jumpSpeed;
      }
      if(Phaser.Input.Keyboard.JustDown(keyJ)) this.doAttack(1);
      if(Phaser.Input.Keyboard.JustDown(keyK)) this.doAttack(2);
      const dir = (enemy.sprite.x > this.sprite.x) ? 1 : -1;
      this.attackBox.x = this.sprite.x + 34*dir;
      this.attackBox.y = this.sprite.y - 44;
      this.label.x = this.sprite.x; this.label.y = this.sprite.y - 140;
      if(this.attackTimer>0) { this.attackTimer -= this.scene.game.loop.delta; if(this.attackTimer<=0) this.isAttacking=false; }
    }
    doAttack(type){ this.isAttacking = true; this.attackPower = type===1?8:18; this.attackTimer = 300; this.attackBox.fillAlpha = 0.25; this.scene.tweens.add({targets:this.attackBox,alpha:0,duration:200}); }
    takeHit(dmg){ this.hp -= dmg; if(this.hp<0) this.hp=0; }
    aiUpdate(player){ if(this.dummy) return; const body = this.sprite.body; const px = player.sprite.x; if(Math.abs(px - this.sprite.x) > 120) body.velocity.x = (px < this.sprite.x) ? -80 : 80; else { body.velocity.x = 0; if(Phaser.Math.Between(0,1000) < 18) this.doAttack(Phaser.Math.Between(1,2)); } this.attackBox.x = this.sprite.x + (player.sprite.x > this.sprite.x ? 34 : -34); this.attackBox.y = this.sprite.y - 44; if(this.attackTimer>0) this.attackTimer -= this.scene.game.loop.delta; }
  }

  const config = { type:Phaser.AUTO, width:GAME_WIDTH, height:GAME_HEIGHT, parent:'gameCanvas', canvas: document.getElementById('gameCanvas'),
    physics:{default:'arcade', arcade:{gravity:{y:1000},debug:false}}, scene:[Boot, FightScene] };
  new Phaser.Game(config);

})();
