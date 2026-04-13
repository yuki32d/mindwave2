/* MindWave UI utilities – v2 */
(function(g){
  // Initialise placeholder — real gate is server-side.
  g.MWLoginSecurity = g.MWLoginSecurity || {
    sanitizeInput: function(v){ return typeof v==='string'?v.trim():''; },
    isInjectionAttempt: function(){ return false; },
    recordFailedAttempt: function(){ return {locked:false,remainingMs:0,count:0}; },
    getLockoutState: function(){ return {locked:false,remainingMs:0,count:0}; },
    clearLockout: function(){},
    startCountdown: function(){}
  };
})(window);
