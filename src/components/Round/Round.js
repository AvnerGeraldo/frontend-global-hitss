import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { Row, Col, Form } from'react-bootstrap'
import styled from 'styled-components'

//Images
import Dice20Faces from '../../assets/images/dice-20-faces.png'

//Actions
import { SET_WHOS_ROUND, CLEAN_WHOS_ROUND } from '../../actions/round'
import { SET_ROUND_ASYNC, THROW_DAMAGE_ASYNC } from '../../actions/saga/round'

//Styled Components
const Img = styled.img`
	width: 50px;
	margin: 10px 0;
`

const ContentCenterRow = styled.div`
	.row {
		justify-content: center!important;
	}

	.row:first-child {
		margin-bottom: 15px;
	}

	.dice {
		cursor: pointer;
	}

	input.form-control, textarea.form-control {
		text-align: center;
	}
`

class Round extends PureComponent
{
	state = {
		isDiceLock: true,
		isBattleGame: false,
		messageRound: '',
		diceValue: 0,
		diceOrc: 0,
		diceHuman: 0,
		isOrcPlayed: false,
		isHumanPlayed: false,
		dataOrc: [],
		dataHuman: [],
		player: ''
	}

	componentDidUpdate() {
		const { dataOrc, dataHuman } = this.state
		const { dataPlayers } = this.props

		if (dataOrc.length === 0 && dataHuman.length === 0 && dataPlayers.length > 0) {
			this.setState({
				isDiceLock: false,
				dataOrc: dataPlayers[0].nome === 'orc' ? dataPlayers[0] : dataPlayers[1],
				dataHuman: dataPlayers[0].nome === 'human' ? dataPlayers[0] : dataPlayers[1]
			}, _=> this.firstStep('human'))
		}
	}

	firstStep = async (player) => {
		const { dispatch, initialPlayer } = this.props
		let { orcId, humanId } = this.props
		const { isHumanPlayed, isOrcPlayed, diceHuman, diceOrc, dataOrc, dataHuman } = this.state
		let playerName = player === 'human' ? 'Humano' : 'Orc'
		
		if (isOrcPlayed && isHumanPlayed) {
			this.setState({
				messageRound: 'Verificando resultados....',
				diceValue: 0
			}, _ => {
				orcId = orcId || dataOrc.id
				humanId = humanId || dataHuman.id
	
				const sumHuman = diceHuman + dataHuman.agilidade
				const sumOrc = diceOrc + dataOrc.agilidade
	
				//Draw
				if (sumHuman === sumOrc) {
					let toPlay = 'human'
	
					if (initialPlayer > 0 && initialPlayer === orcId)
						toPlay = 'orc'
	
					this.setState({
						isHumanPlayed: false,
						isOrcPlayed: false,
						diceHuman: 0,
						diceOrc: 0,
						player: toPlay,
						messageRound: `Deu empate!\nJogador\'${playerName}\' jogue novamente os dados!`,
					}, _=> dispatch({
						type: CLEAN_WHOS_ROUND
					}))
	
					return 
				}
	
				//Highest value
				let idPlayer = humanId
				let toPlay = 'human'
	
				if (sumOrc > sumHuman) {
					idPlayer = orcId
					toPlay = 'orc'
				}
	
				playerName = toPlay === 'human' ? 'Humano' : 'Orc'
	
				//Set content showed
				this.setState({
					messageRound: `O Jogador \'${playerName}\' começa o turno!`,
					diceValue: 0,
					diceOrc: 0,
					diceHuman: 0,
					isOrcPlayed: false,
					isHumanPlayed: false,
					player: toPlay,
					isDiceLock: true,
				}, _=> new Promise((resolve) => {
					//Set Initial Round
					dispatch({
						type: SET_ROUND_ASYNC,
						payload: {
							idPlayer
						}
					})
	
					resolve()
				})
				.then(_ => {
					this.setState({
						messageRound: `O Jogador \'${playerName}\' role o dado!`,
						isDiceLock: false,
						player: toPlay,
						isBattleGame: true
					})
				})
				.then(_=> dispatch({
					type: SET_WHOS_ROUND,
					payload: {
						player: toPlay
					}
				})))
			})
			
			return
		}

		this.setState({
			messageRound: `Início de jogo!\nJogador \'${playerName}\' rode o dado para atacar!`,
			player
		}, _=> dispatch({
			type: SET_WHOS_ROUND,
			payload: {
				player
			}
		}))
	}

	secondStep = player => {		
		const { dispatch, initialPlayer } = this.props
		let { orcId, humanId } = this.props
		const { isHumanPlayed, isOrcPlayed, diceHuman, diceOrc, dataOrc, dataHuman } = this.state
		let playerName = player === 'human' ? 'Humano' : 'Orc'

		if (isHumanPlayed && isOrcPlayed) {
			this.setState({
				messageRound: 'Verificando resultados....',
				diceValue: 0
			}, _ => {
				//Set ids
				orcId = orcId || dataOrc.id
				humanId = humanId || dataHuman.id

				//Whos attack ?
				let atkPlayer = dataHuman
				let diceAtk = diceHuman
				let defPlayer = dataOrc
				let diceDef = diceOrc

				if (initialPlayer === orcId && player === 'orc') {
					atkPlayer = dataOrc
					diceAtk = diceOrc
					defPlayer = dataHuman
					diceDef = diceHuman
				}				

				//Check if throw damage or not
				this.battleRound(atkPlayer, defPlayer, diceAtk, diceDef)
				return

				//Informar aos jogadores que deu empate
				//não causar dano a ninguem
				//verificar se os oponentes ainda tem vida acima de 0
				//Começar um novo turno
			})

			return
		}

		let messageRound = `Jogador \'${playerName}\' role o dado para`
		
		if ((initialPlayer === humanId && player === 'human') || (initialPlayer === humanId && player === 'human')) {
			messageRound += ' atacar!'
		} else {
			messageRound += ' se defender!'
		}

		this.setState({
			messageRound,
			player
		}, _=> dispatch({
			type: SET_WHOS_ROUND,
			payload: {
				player
			}
		}))		
	}

	battleRound = (atkPlayer, defPlayer, diceAtk, diceDef, gameId) => {
		const { dispatch } = this.props
		const playerName = atkPlayer.nome === 'human' ? 'Humano' : 'Orc'

		//Sum values
		const atk = diceAtk + atkPlayer.agilidade + atkPlayer.arma.ataque
		const def = diceDef + defPlayer.agilidade + defPlayer.arma.defesa

		//Check damage
		if (atk > def) {
			this.setState({
				isDiceLock: true,
				messageRound: `Jogador\'${playerName}\' role os dados para causar danos ao oponente!`,
				diceValue: 0,
				diceOrc: 0,
				diceHuman: 0,
				isOrcPlayed: false,
				isHumanPlayed: false,
			}, _=> dispatch({
				type: SET_WHOS_ROUND,
				payload: {
					player: atkPlayer.nome
				}
			}))
		}
	}

	throwDamage = (idDamagePlayer, gameId, damage) => {
		const { dispatch } = this.props

		dispatch({
			type: THROW_DAMAGE_ASYNC,
			payload: {
				idDamagePlayer, 
				gameId, 
				damage
			}
		})
		.then(_=> this.setState({
			//messageRound: `Jogador \'${playerName}\' recebeu ${damage} de dano!`
		}))
	}

	throwDices = _ => {	
		const { isDiceLock, diceHuman, diceOrc, player, isHumanPlayed, isOrcPlayed, isBattleGame } = this.state
	
		if (!isDiceLock) {
			const min = Math.ceil(1);
			const max = Math.floor(20);
			const diceValue = Math.floor(Math.random() * (max - min + 1)) + min
			const throwDiceOrc = player === 'orc' ? diceValue : diceOrc
			const throwDiceHuman = player === 'human' ? diceValue : diceHuman
	
			//Set value of dice
			this.setState({
				diceValue,
				diceOrc: throwDiceOrc,
				diceHuman: throwDiceHuman,
				isHumanPlayed: player === 'human' ? true : isHumanPlayed,
				isOrcPlayed: player === 'orc' ? true : isOrcPlayed
			}, _=> {
				//Call start round
				!isBattleGame && this.firstStep(player === 'orc' ? 'human': 'orc')

				//Call battle
				isBattleGame && this.secondStep(player === 'orc' ? 'human': 'orc')
			})
		}
	}
	

	render() {
		const { messageRound, diceValue } = this.state
		const { round, error } = this.props

		if (error)
			return (
				<Row>{error}</Row>
			)

		return (
			<ContentCenterRow>
				<Row>
					<Col xs='12' md='8' lg='6'>
						<Form.Control 
							type='text'
							ref='txtRound'
							value={round > 0 ? round : ''}
							readOnly />
					</Col>
				</Row>
				<Row>
					<Form.Control 
						as="textarea" 
						rows="3"
						value={messageRound}
						ref='txtMessageRound'
						readOnly 
						style={{ resize: 'none' }}/>
				</Row>
				<Row>
					<Img src={Dice20Faces} alt='Dice 20 faces' onClick={this.throwDices} className='dice'/>
				</Row>
				<Row>
					<Col md='8' lg='6'>
						<Form.Control 
							type='text'
							ref='txtDice'
							value={diceValue > 0 ? diceValue : ''}
							readOnly
						/>
					</Col>
				</Row>
			</ContentCenterRow>
		)
	}
}

const mapStateToProps = ({ roundReducer, playersReducer }) => ({
	...roundReducer,
	dataPlayers: playersReducer.data
})

export default connect(mapStateToProps)(Round)