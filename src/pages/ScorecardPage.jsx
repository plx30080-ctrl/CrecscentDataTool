
import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  CircularProgress
} from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ScorecardPage = () => {
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchScorecard = async () => {
      if (currentUser) {
        const scorecardRef = doc(db, 'scorecards', currentUser.uid);
        const docSnap = await getDoc(scorecardRef);
        if (docSnap.exists()) {
          setPlayers(docSnap.data().players);
        }
        setLoading(false);
      }
    };
    fetchScorecard();
  }, [currentUser]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const saveScorecard = async () => {
      if (currentUser) {
        const scorecardRef = doc(db, 'scorecards', currentUser.uid);
        await setDoc(scorecardRef, { players });
      }
    };

    saveScorecard();
  }, [players, currentUser]);

  const handleAddPlayer = () => {
    if (newPlayer.trim() !== '') {
      setPlayers([...players, { name: newPlayer, score: 0 }]);
      setNewPlayer('');
    }
  };

  const handleScoreChange = (index, delta) => {
    const newPlayers = [...players];
    newPlayers[index].score += delta;
    setPlayers(newPlayers);
  };

  const handleRemovePlayer = (index) => {
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
  };

  const handleResetScores = () => {
    const newPlayers = players.map(player => ({ ...player, score: 0 }));
    setPlayers(newPlayers);
  };

  if (loading) {
    return (
      <Container maxWidth="md" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Scorecard
      </Typography>
      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <TextField
          label="New Player"
          variant="outlined"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
        />
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAddPlayer} 
          style={{ marginLeft: '10px' }}
        >
          Add Player
        </Button>
      </div>
      <List>
        {players.map((player, index) => (
          <ListItem key={index} divider>
            <ListItemText primary={player.name} secondary={`Score: ${player.score}`} />
            <IconButton onClick={() => handleScoreChange(index, 1)}>
              <Add />
            </IconButton>
            <IconButton onClick={() => handleScoreChange(index, -1)}>
              <Remove />
            </IconButton>
            <IconButton onClick={() => handleRemovePlayer(index)}>
              <Delete />
            </IconButton>
          </ListItem>
        ))}
      </List>
      {players.length > 0 && (
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={handleResetScores} 
          style={{ marginTop: '20px' }}
        >
          Reset Scores
        </Button>
      )}
    </Container>
  );
};

export default ScorecardPage;
